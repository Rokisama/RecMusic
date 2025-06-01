import torch
import numpy as np
import torch.nn as nn

class PointWiseFeedForward(nn.Module):
    def __init__(self, hidden_units, dropout_rate):
        super().__init__()
        self.conv1 = nn.Conv1d(hidden_units, hidden_units, kernel_size=1)
        self.dropout1 = nn.Dropout(p=dropout_rate)
        self.relu = nn.ReLU()
        self.conv2 = nn.Conv1d(hidden_units, hidden_units, kernel_size=1)
        self.dropout2 = nn.Dropout(p=dropout_rate)

    def forward(self, inputs):
        outputs = self.dropout2(
            self.conv2(
                self.relu(
                    self.dropout1(
                        self.conv1(inputs.transpose(-1, -2))
                    )
                )
            )
        )
        outputs = outputs.transpose(-1, -2)
        outputs += inputs
        return outputs

class SASRec(nn.Module):
    def __init__(self, user_num, item_num, args, tag_feature_tensor):
        super().__init__()
        self.user_num = user_num
        self.item_num = item_num
        self.dev = args.device
        self.hidden_units = args.hidden_units

        self.item_emb = nn.Embedding(self.item_num + 1, args.hidden_units, padding_idx=0)
        self.pos_emb = nn.Embedding(args.maxlen + 1, args.hidden_units, padding_idx=0)
        self.emb_dropout = nn.Dropout(p=args.dropout_rate)

        # Project tag + year features to hidden_units
        self.feature_proj = nn.Linear(tag_feature_tensor.shape[1], args.hidden_units)
        self.alpha = nn.Parameter(torch.tensor(0.1))

        tag_feature_tensor = tag_feature_tensor.to(self.dev)
        self.audio_features = torch.cat([
            torch.zeros((1, tag_feature_tensor.shape[1]), device=self.dev),
            tag_feature_tensor
        ], dim=0)

        self.attention_layernorms = nn.ModuleList()
        self.attention_layers = nn.ModuleList()
        self.forward_layernorms = nn.ModuleList()
        self.forward_layers = nn.ModuleList()
        self.last_layernorm = nn.LayerNorm(args.hidden_units, eps=1e-8)

        for _ in range(args.num_blocks):
            self.attention_layernorms.append(nn.LayerNorm(args.hidden_units, eps=1e-8))
            self.attention_layers.append(nn.MultiheadAttention(args.hidden_units, args.num_heads, args.dropout_rate))
            self.forward_layernorms.append(nn.LayerNorm(args.hidden_units, eps=1e-8))
            self.forward_layers.append(PointWiseFeedForward(args.hidden_units, args.dropout_rate))

    def log2feats(self, log_seqs):
        item_ids = log_seqs.to(self.dev)
        item_embs = self.item_emb(item_ids)
        audio_feats = self.audio_features[item_ids]
        audio_proj = self.feature_proj(audio_feats)

        fused_feats = self.alpha * item_embs + (1 - self.alpha) * audio_proj
        fused_feats *= self.hidden_units ** 0.5

        log_seqs_np = log_seqs.cpu().numpy() if isinstance(log_seqs, torch.Tensor) else log_seqs
        poss = np.tile(np.arange(1, log_seqs_np.shape[1] + 1), [log_seqs_np.shape[0], 1])
        poss *= (log_seqs_np != 0)
        poss = np.minimum(poss, self.pos_emb.num_embeddings - 1)
        fused_feats += self.pos_emb(torch.tensor(poss, dtype=torch.long, device=self.dev))
        fused_feats = self.emb_dropout(fused_feats)

        tl = fused_feats.shape[1]
        attention_mask = ~torch.tril(torch.ones((tl, tl), dtype=torch.bool, device=self.dev))

        for i in range(len(self.attention_layers)):
            fused_feats = torch.transpose(fused_feats, 0, 1)
            Q = self.attention_layernorms[i](fused_feats)
            mha_outputs, _ = self.attention_layers[i](Q, fused_feats, fused_feats, attn_mask=attention_mask)
            fused_feats = Q + mha_outputs
            fused_feats = torch.transpose(fused_feats, 0, 1)
            fused_feats = self.forward_layernorms[i](fused_feats)
            fused_feats = self.forward_layers[i](fused_feats)

        return self.last_layernorm(fused_feats)

    def forward(self, user_ids, log_seqs, pos_seqs, neg_seqs):
        log_feats = self.log2feats(log_seqs)
        pos_embs = self.item_emb(pos_seqs.to(self.dev))
        neg_embs = self.item_emb(neg_seqs.to(self.dev))
        pos_logits = (log_feats * pos_embs).sum(dim=-1)
        neg_logits = (log_feats * neg_embs).sum(dim=-1)
        return pos_logits, neg_logits

    def predict(self, user_ids, log_seqs, item_indices, pos_seqs=None, neg_seqs=None):
        log_feats = self.log2feats(log_seqs)
        final_feat = log_feats[:, -1, :]

        item_embs = self.item_emb(item_indices)
        logits = item_embs.matmul(final_feat.unsqueeze(-1)).squeeze(-1)

        if pos_seqs is not None:
            for i, pos_ids in enumerate(pos_seqs):
                for pid in pos_ids:
                    mask = (item_indices[i] == pid)
                    logits[i][mask] += 1.0

        if neg_seqs is not None:
            for i, neg_ids in enumerate(neg_seqs):
                for nid in neg_ids:
                    mask = (item_indices[i] == nid)
                    logits[i][mask] -= 1.0

        return logits