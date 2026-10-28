import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is a client-side page talking to the API, so the site is exported
  // as plain static files (./out) and hosted on AWS Amplify Hosting (see deploy.sh).
  output: "export",
};

export default nextConfig;
