## create app and google client id

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to "APIs & Services" > "Credentials".
4. Click on "Create Credentials" and select "OAuth client ID".
5. Choose "Web application" as the application type.
6. Add ALL authorized JavaScript origins (e.g., `http://localhost:5173`) and authorized redirect URIs (e.g., `http://localhost:5173`).

- `http://localhost:5173` - standard local development URL for Vite
- `http://localhost:8080`
- e.g. vercel preview URL like `https://pendler-alarm-de.vercel.app`
- live url like `https://pendler-alarm.de`

7. Click "Create" and note down the generated client ID.
8. Add the client ID to your `.env` file or on Vercel as an environment variable named `VITE_GOOGLE_CLIENT_ID` to use it in the app.

## add test user

1. In the Google Cloud Console, navigate to "APIs & Services" > "OAuth consent screen".
2. Select "External" and click "Create".
3. Fill in the required fields (e.g., App name, User support email, Developer contact information).
4. Save and continue, then add your email address as a test user.
5. Save the changes and you should now be able to authenticate with your Google account when running the app locally.

## add new user

- Select your project in the [Google Cloud Console](https://console.cloud.google.com/) Project picker at the top left dropdown of the page.
- go to "Google Auth Platform" > "Audience" > > "Test users"

## add new Javascript origins

- Select your project in the [Google Cloud Console](https://console.cloud.google.com/) Project picker at the top left dropdown of the page.
- go to "Google Auth Platform" > "Clients" > select your client > "Authorized Javascript origins"
- add new origins like `http://localhost:8080` or `https://pendler-alarm-de.vercel.app` or `https://pendler-alarm.de`
