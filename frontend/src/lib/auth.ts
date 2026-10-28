const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

async function authRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/auth${path}`, {
      ...options,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new AuthError(
      "Could not connect to the backend. Check that the server is running.",
      0,
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let message = "Request failed. Please try again.";

    if (typeof data?.detail === "string") {
      message = data.detail;
    } else if (Array.isArray(data?.detail)) {
      message = data.detail
        .map((item: { msg: string }) => item.msg)
        .join(". ");
    }

    throw new AuthError(message, response.status);
  }

  return data as T;
}

export function signup(name: string, email: string, password: string) {
  return authRequest<{ message: string; user: User }>("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email: string, password: string) {
  return authRequest<{ message: string; user: User }>("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function getMe() {
  return authRequest<User>("/me");
}

export function logout() {
  return authRequest<{ message: string }>("/logout", {
    method: "POST",
  });
}