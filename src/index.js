require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { googleAI } = require("@genkit-ai/googleai");
const { genkit } = require("genkit");

const app = express();

// CORS
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// Private Network Access support for AI Studio preview
app.use((req, res, next) => {
  if (req.headers["access-control-request-private-network"]) {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});

app.use(express.json());

// Genkit + Gemini
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  model: googleAI.model("gemini-3.5-flash-lite"),
});

// Travel itinerary flow
const travelItineraryFlow = ai.defineFlow(
  "travelItineraryFlow",
  async (tripRequest) => {
    const prompt = `Create a simple travel itinerary in plain text.

Use short headings and bullet points.
Keep it easy for students to read.
Include Day-wise plan, local food, and budget tips.

Trip request: ${tripRequest}`;

    const { text } = await ai.generate(prompt);

    if (!text) {
      throw new Error("Failed to generate itinerary text");
    }

    return text;
  }
);

// Backend port
const PORT = process.env.PORT || 3002;

// API
app.get("/", async (req, res) => {
  try {
    const tripRequest =
      req.query.trip ||
      "Make a 20-day trip itinerary from India to Japan";

    console.log("Trip request:", tripRequest);

    const itineraryText =
      await travelItineraryFlow(tripRequest);

    res.type("text/plain").send(itineraryText);
  } catch (error) {
    console.error("Gemini Error:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate itinerary",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend is Running on port ${PORT}`);
});