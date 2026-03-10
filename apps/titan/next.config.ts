import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseHostname = (() => {
  if (!supabaseUrl) {
    return 'your-project.supabase.co'
  }
  try {
    return new URL(supabaseUrl).hostname
  } catch {
    return 'your-project.supabase.co'
  }
})()

const nextConfig: NextConfig = {
  turbopack: {
    // Fix: path contains spaces ("MASTER ESPORTES", "SMAART PRO"), causing Turbopack
    // to misdetect the workspace root from the monorepo lockfile.
    // Setting root explicitly to this app's directory prevents the issue.
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHostname,
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
