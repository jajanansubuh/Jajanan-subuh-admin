"use client";
import { CldUploadWidget } from "next-cloudinary";

export default function TestUpload() {
  return (
    <CldUploadWidget
      uploadPreset="dgerwh95h"
      onUpload={(result) => {
        console.log("Upload result:", result);
      }}
    >
      {({ open }) => <button onClick={() => open()}>Upload</button>}
    </CldUploadWidget>
  );
}
