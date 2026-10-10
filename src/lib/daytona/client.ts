import { Daytona } from "@daytona/sdk"

if (!process.env.DAYTONA_API_KEY) {
    throw new Error("Missing Daytona API Key")
}

export const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY })