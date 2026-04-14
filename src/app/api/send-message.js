export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { to } = req.body;

  try {
    const response = await fetch("https://graph.facebook.com/v19.0/979565035250717/messages", {
      method: "POST",
      headers: {
        "Authorization": "Bearer EAAR9DcH5pUoBREExQFQy8o5l04LliZATSUFfiHZCFQwilFGGj0oRZBZBEI8T2meNDckhQfX5OZA59nATm2XVypqQkKQZAlYfkNwJUsIQ3nRWn5DHwgm0IOL5YAaYTBmcBwQFzAHYBa8SqwsuZAbOKvlOlBT5JbYdJWJjiB80IT3fOzYyMc4r7kfDxXnJdvxjDUh1YWqVc1ByKHGFUxsluB1Wfwz6QsQI3JTmTYbGh3oGVh",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "template",
        template: {
          name: "welcome_message",
          language: { code: "ar" }
        }
      })
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}