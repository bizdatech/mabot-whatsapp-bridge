MABOT WhatsApp Cloud Bridge — Render setup (one time, about 10 minutes)
======================================================================

1. Put this folder in a new GitHub repository (github.com -> New repository -> upload files).
2. Go to render.com, sign up (free) with GitHub.
3. New + -> Web Service -> pick your repository.
   - Runtime: Node   - Build command: npm install   - Start command: npm start
   - Instance type: Free
4. Under "Environment", add:
   KIRA_URL   = the "Server address" shown in Kira -> MABOT -> WhatsApp
   BRIDGE_KEY = the "Bridge key" shown in Kira -> MABOT -> WhatsApp
5. Click Deploy. When it is live, open Kira -> MABOT. A QR code appears.
   On your phone: WhatsApp -> Settings -> Linked Devices -> Link a device -> scan.

Keep it awake (free):
6. Sign up at cron-job.org or uptimerobot.com (free).
   Add a monitor that opens  https://<your-render-name>.onrender.com/health  every 10 minutes.

Notes:
- Render free restarts the service now and then; when that happens a new QR code
  appears in Kira and you scan again.
- MABOT only replies to customers who message you. It never sends promotions.
- Test with a spare number first if you can.
