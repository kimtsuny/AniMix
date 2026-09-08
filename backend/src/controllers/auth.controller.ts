import type { Request, Response } from "express";
import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// ---------------------------------------------------------------------------
// Request body types
// ---------------------------------------------------------------------------

interface RegisterBody {
  username?: string;
  email?: string;
  password?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

// ---------------------------------------------------------------------------
// Cookie configuration (shared across register and login)
// ---------------------------------------------------------------------------

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body as RegisterBody;

    // التحقق من الحقول
    if (!username || !email || !password) {
      res.status(400).json({
        message: "All fields are required",
      });
      return;
    }

    // التحقق من وجود مستخدم بنفس الإيميل
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      res.status(409).json({
        message: "Email already exists",
      });
      return;
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إنشاء المستخدم
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    // إنشاء JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // حفظ JWT داخل HttpOnly Cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    // إرسال الاستجابة
    res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as LoginBody;

    if (!email || !password) {
      res.status(400).json({
        message: "Email and password are required",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    console.log("Email from request:", email);
    console.log("User from DB:", user);

    if (!user) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    console.log("Password correct:", isPasswordCorrect);

    if (!isPasswordCorrect) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("token", token, COOKIE_OPTIONS);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error: unknown) {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user!.id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        message: "User not found",
      });
      return;
    }

    res.status(200).json(user);
  } catch (error: unknown) {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  res.status(200).json({
    message: "Logout successful",
  });
}
