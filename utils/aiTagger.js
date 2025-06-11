const { OpenAI } = require("openai");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Your OpenAI API key from .env file
});

async function classifyText(text) {
  const categories = [
    "Sports",
    "Technology",
    "Health",
    "Business",
    "Entertainment",
    "Politics",
    "Science",
    "Lifestyle",
    "Education",
    "Fashion",
    "Gaming",
    "Fitness",
    "Parenting",
    "News",
    "Social Media",
    "Automotive",
    "Real Estate",
    "Marketing",
    "Law",
    "Environment",
    "Psychology",
    "Design",
    "Space",
    "Engineering",
    "Economy",
    "AI",
    "Food & Drink",
    "Movies",
    "TV Shows",
    "Fiction",
    "Non-fiction",
    "Psychology",
    "Programming",
    "Web Development",
    "Health & Fitness",
    "Interior Design",
    "Fitness & Wellness",
    "Special Interest", // Your custom category
  ];

  const categoriesText = categories.join(", "); // Join all categories into a single string

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a text classifier. You must classify the user's input into exactly one of the following categories:\n\n${categoriesText}.\n\nRespond with ONLY the category name from the list. No explanations, no extra text.`,
        },
        {
          role: "user",
          content: text, // The text you want to classify
        },
      ],
    });

    let classification = response.choices[0].message.content.trim();

    // Check if the result is a sentence and extract the category
    if (classification.includes("This falls under the category of")) {
      const match = classification.match(/category of (.*)\./);
      if (match) {
        classification = match[1]; // Extract only the category
      }
    }

    console.log("Classification Result:", classification);

    // Return the result (classification)
    return classification;
  } catch (error) {
    console.error("Error during classification:", error);
    return "Uncategorized";
  }
}

module.exports = { classifyText };
