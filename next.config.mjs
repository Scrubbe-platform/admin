/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Cover images are stored as absolute URLs on whatever host serves them.
    // Until the media endpoint is confirmed we do not know the host, so remote
    // images are rendered with a plain <img> rather than next/image.
    unoptimized: true,
  },
};
export default nextConfig;
