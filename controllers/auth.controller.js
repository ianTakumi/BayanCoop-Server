import { supabase } from "../utils/supabase_client.js";

// User Registration
export const userRegister = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;

    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          phone,
          role: "user",
        },
      });

    if (authError) {
      console.error("Auth error:", authError.message);
      return res.status(400).json({ error: authError.message });
    }

    const userId = authUser.user.id;

    const { data: userRecord, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          id: userId,
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
          role: "user",
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError.message);
      return res.status(400).json({ error: insertError.message });
    }

    const { error: emailError } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    });

    if (emailError) {
      console.error("Error sending verification email:", emailError.message);
      return res
        .status(500)
        .json({ error: "Error sending confirmation email" });
    }

    return res.status(201).json({
      message: "User registered successfully!",
      user: userRecord,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Coop registration
export const coopRegister = async (req, res) => {};

// Courier register
export const courierRegister = async (req, res) => {};

// User login
export const userLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Step 1: Sign in user with Supabase Auth
    const { data: authSession, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      console.error("Auth error:", authError.message);
      return res.status(400).json({ error: authError.message });
    }

    // Step 2: Get the user ID from session
    const userId = authSession.user?.id;

    console.log(userId);

    if (!userId) {
      return res.status(400).json({ error: "User ID not found in session" });
    }

    // Step 3: Fetch the user record from your `users` table
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    console.log(userRecord);
    if (userError) {
      console.error("User fetch error:", userError.message);
      return res.status(400).json({ error: userError.message });
    }

    // Step 4: Return both the session and user record
    return res.status(200).json({
      session: authSession.session,
      user: userRecord,
    });
  } catch (err) {
    console.error("Unexpected error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// Coop login
export const coopLogin = async (req, res) => {};

// Curier Login
export const courierLogin = async (req, res) => {};
