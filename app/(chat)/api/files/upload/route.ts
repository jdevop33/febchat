import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "File size should be less than 5MB",
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => ["image/jpeg", "image/png"].includes(file.type), {
      message: "File type should be JPEG or PNG",
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename properly handling both Blob and File types
    let filename: string;

    const formFile = formData.get("file");
    if (formFile instanceof File) {
      // It's a File object with name property
      filename = formFile.name;
    } else if (file instanceof Blob) {
      // It's a Blob without name, generate filename based on content type
      const contentType = file.type || "application/octet-stream";
      const extension = contentType.split("/")[1] || "bin";
      filename = `upload-${Date.now()}.${extension}`;
    } else {
      // Not a valid file object at all
      return NextResponse.json(
        { error: "Invalid file format" },
        { status: 400 },
      );
    }

    const fileBuffer = await file.arrayBuffer();

    try {
      // Use authenticated user's ID to create a scoped upload path
      const userId = session.user?.id || "anonymous";
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

      const data = await put(
        `users/${userId}/${sanitizedFilename}`,
        fileBuffer,
        {
          access: "public", // Using public access as required by Vercel Blob
          contentType: file.type,
        },
      );

      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
