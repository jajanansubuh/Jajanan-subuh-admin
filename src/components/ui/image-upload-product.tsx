"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";
import { ImagePlus, Trash } from "lucide-react";
import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";

interface ImageUploadProps {
  disabled?: boolean;
  onChange: (value: string[]) => void;
  onRemove: (value: string) => void;
  value: string[];
}

// UploadInfo type not used

const ImageUploadProduct: React.FC<ImageUploadProps> = ({
  disabled,
  onChange,
  onRemove,
  value,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {value.filter(Boolean).map((url) => (
          <div
            key={url}
            className="relative rounded-md overflow-hidden w-28 h-28 sm:w-40 sm:h-40"
          >
            <div className="z-10 absolute top-2 right-2">
              <Button
                type="button"
                onClick={() => onRemove(url)}
                variant="destructive"
                size="icon"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
            <Image fill className="object-cover" alt="Image" src={url} />
          </div>
        ))}
      </div>
      <CldUploadWidget
        uploadPreset="dgerwh95h"
        options={{
          multiple: true,
          singleUploadAutoClose: false,
          sources: ["local", "url", "camera"],
        }}
        onSuccess={(result) => {
          let urls: string[] = [];
          if (Array.isArray(result.info)) {
            urls = result.info
              .filter(
                (info) => typeof info !== "string" && "secure_url" in info
              )
              .map((info) => info.secure_url);
          } else if (
            result.info &&
            typeof result.info !== "string" &&
            "secure_url" in result.info
          ) {
            urls = [result.info.secure_url];
          }
          if (urls.length > 0) {
            onChange([...value, ...urls]);
          }
        }}
      >
        {({ open, isLoading }) => (
          <Button
            type="button"
            disabled={disabled || isLoading}
            variant="secondary"
            onClick={() => open()} // ✅ Wrap in a lambda
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            {isLoading ? "Uploading..." : "Upload image"}
          </Button>
        )}
      </CldUploadWidget>
    </div>
  );
};

export default ImageUploadProduct;
