import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; 

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: Request) {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const request = await req.json();
      console.log('Incoming request')

      if (!request || typeof request !== "object") {
        console.error("Invalid request body");
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }

      if (!request.password) {
        console.error("Missing password in request");
        return NextResponse.json({ error: "Password required" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(request.password, 10);
      
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: request.email },
        });

        if (existingUser) {
          return NextResponse.json(
            { error: "User with this email already exists" },
            { status: 400 }
          );
        }

        const user = await prisma.user.create({
          data: {
            username: request.username,
            email: request.email,
            password: hashedPassword,
          },
        });

        return NextResponse.json({ user }, { status: 200 });
      } catch (dbError) {
        if (dbError instanceof Error && dbError.message.includes('connection pool')) {
          // If it's a connection pool error, retry
          retries++;
          if (retries < MAX_RETRIES) {
            console.log(`Retrying database operation. Attempt ${retries + 1} of ${MAX_RETRIES}`);
            await wait(RETRY_DELAY);
            continue;
          }
        }
        throw dbError; // Re-throw if it's not a connection pool error or we're out of retries
      }

    } catch (error) {
      console.error("Error occurred:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
      return NextResponse.json({ 
        error: "User creation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }
  }

  // If we've exhausted all retries
  return NextResponse.json({ 
    error: "Database connection failed after multiple attempts"
  }, { status: 500 });
}