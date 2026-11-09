ALISA ILINOVA — PORTFOLIO WEBSITE
Static site: plain HTML, CSS and JavaScript. No build step, no dependencies.

PUBLISH ON VERCEL (about 10 minutes, free plan)
1. Create a GitHub account at github.com (if you do not have one).
2. On GitHub: "+" (top right) > "New repository". Name: alisa-ilinova-portfolio. Public or Private. Click "Create repository".
3. On the new repository page click "uploading an existing file".
   Unzip this archive on your computer, open the folder, select EVERYTHING inside it
   (index.html, about.html, contact.html, 404.html, vercel.json, the "assets" and "work" folders, the icons)
   and drag it into the browser window. Wait for the upload, then click "Commit changes".
   Important: index.html must be at the top level of the repository, not inside a sub-folder.
4. Go to vercel.com > "Sign Up" > "Continue with GitHub".
5. "Add New..." > "Project" > find alisa-ilinova-portfolio > "Import".
6. Framework Preset: "Other". Leave Build Command and Output Directory empty. Click "Deploy".
7. After about 30 seconds you get the address, e.g. alisa-ilinova-portfolio.vercel.app.
   To change it: Project > Settings > Domains.

UPDATING LATER
Upload changed files to the same GitHub repository ("Add file" > "Upload files"). Vercel republishes automatically.

HOMEPAGE HERO
The 3D scene loads only when the device supports WebGL2 and no "reduce motion" / data-saver setting is on.
If it is slow or fails, the page silently shows the static hero image instead.
Test links:  /index.html?hero=static  (force the static version)   /index.html?hero=3d  (force 3D)

FONTS (self-hosted, SIL Open Font License): Instrument Sans, Instrument Serif, Geist Mono.
