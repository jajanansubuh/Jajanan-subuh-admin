import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        // port: "400",
        pathname: "/**", // all paths under it
      },
    ],
  },
  allowedDevOrigins: ["https://your-ngrok-subdomain.ngrok-free.app"],
};
// module.exports = {
//   async headers() {
//     return [
//       {
//         source: "/(.*)",
//         headers: [
//           {
//             key: "Content-Security-Policy",
//             value:
//               "connect-src 'self' https://www.googleadservices.com https://signalera-pa.clients6.google.com",
//           },
//         ],
//       },
//     ];
//   },
// };
export default nextConfig;
