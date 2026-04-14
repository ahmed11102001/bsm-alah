let templates = [
    {
      id: 1,
      name: "welcome_message",
      status: "approved",
      language: "ar",
      category: "marketing",
      content: "👋 أهلاً بيك! دي رسالة ترحيب من النظام"
    },
    {
      id: 2,
      name: "hello_world",
      status: "approved",
      language: "en_US",
      category: "utility",
      content: "Hello 👋 this is a test message"
    }
  ];
  export default function handler(req: any, res: any) {
    if (req.method === "GET") {
      return res.status(200).json(templates);
    }
  
    if (req.method === "POST") {
      const newTemplate = {
        id: Date.now(),
        ...req.body,
        status: "pending"
      };
  
      templates.unshift(newTemplate);
      return res.status(200).json(newTemplate);
    }
  
    if (req.method === "DELETE") {
      const { id } = req.query;
      templates = templates.filter(t => t.id != id);
      return res.status(200).json({ success: true });
    }
  }