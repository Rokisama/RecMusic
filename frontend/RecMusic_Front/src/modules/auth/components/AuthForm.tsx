import { SubmitHandler, useForm } from "react-hook-form";
import { string, z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {Link, useNavigate} from "react-router-dom";
import { useAuth } from "../AuthContext.tsx";
import  "./AuthForm.css";

const schema = (mode: "register" | "login") =>
    z
        .object({
            username: z.string().min(1, "Username is required"),
            password: z.string().min(4, "Password must be at least 6 characters"),
            confirmPassword: mode === "register"
                ? z.string().min(6, "Password must be at least 6 characters")
                : z.string().optional(),
        })
        .refine((data) => mode === "register" ? data.password === data.confirmPassword : true, {
            message: "Passwords must match",
            path: ["confirmPassword"],
        });

type FormFields = {
    username: string;
    password: string;
    confirmPassword?: string;
};

type AuthFormProps = {
    mode: "register" | "login";
};

const AuthForm = ({ mode }: AuthFormProps) => {

    const { login } = useAuth();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FormFields>({
        resolver: zodResolver(schema(mode)),
    });

    const onSubmit: SubmitHandler<FormFields> = async (data) => {
        try {
            const endpoint = mode === "register" ? "http://localhost:8000/api/users/register" : "http://localhost:8000/api/users/login";
            const { confirmPassword, ...submitData } = data;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(submitData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error response from server:`, errorText);
                throw new Error(`${mode === "register" ? "Registration" : "Login"} failed: ${errorText}`);
            }

            const result = await response.json().catch(() => null); // Handle empty response
            console.log(`${mode === "register" ? "Registration" : "Login"} successful:`, result);

            login(result.access, result.refresh, result.user);
            navigate("/");

        } catch (error) {
            console.error(`Error during ${mode} process:`, error);
        }
    };

    return (
        <div className="AuthFormContainer bg-primary">
            <div className="AuthForm">
            <h2 className="FormTitle">{mode === "register" ? "Sign Up" : "Login"}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="Form">
                <div>
                    <input className="Input" {...register("username")} type="text" placeholder="Username" />
                    {errors.username && <p>{errors.username.message}</p>}
                </div>
                <div>
                    <input className="Input" {...register("password")} type="password" placeholder="Password" />
                    {errors.password && <p>{errors.password.message}</p>}
                </div>
                {mode === "register" && (
                    <div>
                        <input {...register("confirmPassword")} type="password" placeholder="Confirm Password" />
                        {errors.confirmPassword && <p>{errors.confirmPassword.message}</p>}
                    </div>
                )}
                <button className="SubmitBtn" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Loading..." : mode === "register" ? "Sign Up" : "Sign In"}
                </button>
                {mode !== "register" && (
                    <div>
                        <Link to={"/register"}>Don't have an account? Sign up!</Link>
                    </div>
                )}
            </form>
            </div>
        </div>
    );
};

export default AuthForm;
