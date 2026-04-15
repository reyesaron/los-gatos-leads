import { loadUsers, saveUsers, hashPassword, validatePassword, validateEmail, sanitizeUser, getClientIP, checkSignupRateLimit, recordSignupAttempt } from "@/lib/auth";

export async function POST(request) {
  try {
    const ip = getClientIP(request);

    // Check signup rate limit
    const rateCheck = checkSignupRateLimit(ip);
    if (rateCheck.blocked) {
      return Response.json({ error: rateCheck.message }, { status: 429 });
    }

    const { name, email, password, passwordConfirm } = await request.json();

    if (!name || !email || !password || !passwordConfirm) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password !== passwordConfirm) {
      return Response.json({ error: "Passwords do not match" }, { status: 400 });
    }

    const emailErr = validateEmail(email);
    if (emailErr) return Response.json({ error: emailErr }, { status: 400 });

    const passErr = validatePassword(password);
    if (passErr) return Response.json({ error: passErr }, { status: 400 });

    const users = await loadUsers();

    // Check for existing email
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return Response.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    // Record the attempt
    recordSignupAttempt(ip);

    const passwordHash = await hashPassword(password);
    const isFirstUser = users.length === 0;

    const newUser = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: isFirstUser ? "admin" : "user",
      status: isFirstUser ? "approved" : "pending",
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await saveUsers(users);

    return Response.json({
      ok: true,
      user: sanitizeUser(newUser),
      message: isFirstUser
        ? "Admin account created. You can now log in."
        : "Account created. Pending admin approval.",
    });
  } catch (err) {
    return Response.json({ error: "Signup failed: " + err.message }, { status: 500 });
  }
}
