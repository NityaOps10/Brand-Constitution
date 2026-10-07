This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Demo collaboration

Open [http://localhost:3000/collaborate](http://localhost:3000/collaborate) to try one-to-one text chat and voice/video calls with the shared demo profiles. Set `NEXT_PUBLIC_COMETCHAT_APP_ID`, `NEXT_PUBLIC_COMETCHAT_REGION`, and `COMETCHAT_API_KEY` in `.env.local`. `COMETCHAT_API_KEY` must be a CometChat Auth Only key and must remain server-side (never add the `NEXT_PUBLIC_` prefix). Calls require calling to be enabled for the CometChat app, a browser with microphone/camera permissions, and HTTPS outside localhost.

The profile picker is intentionally a public demo identity selector, not application authentication. Anyone can select any demo profile and read its shared chat history. Do not use it for private or production conversations; add real application authentication and bind CometChat UIDs to authenticated server sessions first.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
