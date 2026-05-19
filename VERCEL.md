# Deploy Worksy Backend to Vercel

## 1. Push to GitHub

Deploy the **`backend`** folder as its own repository (or set Vercel **Root Directory** to `backend` in a monorepo).

## 2. Import on Vercel

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Import your backend GitHub repo
3. Framework Preset: **Other**
4. Root Directory: `.` (if repo is only backend) or `backend` (if monorepo)

Vercel will detect `vercel.json` automatically.

## 3. Environment variables

In Vercel → **Settings** → **Environment Variables**, add:

| Name | Example |
|------|---------|
| `MONGO_URI` | `mongodb+srv://...` (MongoDB Atlas) |
| `JWT_SECRET` | long random string |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | `https://your-frontend.vercel.app` |

For local + production CORS, use comma-separated URLs:

```
http://localhost:3000,https://your-frontend.vercel.app
```

## 4. MongoDB Atlas

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Network Access** → Add IP `0.0.0.0/0` (allow Vercel serverless)
3. Copy connection string into `MONGO_URI`

## 5. Test after deploy

```
GET https://YOUR-PROJECT.vercel.app/api/health
```

Expected: `{ "success": true, "data": { "status": "ok", ... } }`

## 6. Frontend

Set in frontend `.env.local` / Vercel:

```
NEXT_PUBLIC_API_URL=https://YOUR-PROJECT.vercel.app/api
```

## File uploads on Vercel

Uploads use **ephemeral `/tmp` storage**. Files may not persist across deployments or cold starts. For production file storage, plan **S3**, **Cloudinary**, or **Vercel Blob** later.
