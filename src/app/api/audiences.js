const prisma = require('./lib/prisma');

export default async function handler(req, res) {
  // 1. جلب كل الجماهير (علشان تظهر في الجدول)
  if (req.method === 'GET') {
    try {
      const audiences = await prisma.audience.findMany({
        include: { 
          contacts: { take: 5 }, // هنجيب أول 5 أرقام بس عشان نعرضهم tags تحت الكارت
          _count: { select: { contacts: true } } // ده اللي بيطلع عدد الأرقام الكلي
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(audiences);
    } catch (error) {
      return res.status(500).json({ error: "فشل في جلب البيانات" });
    }
  }

  // 2. حفظ جمهور جديد (POST)
  if (req.method === 'POST') {
    const { name, contacts } = req.body; 
    try {
      const newAudience = await prisma.audience.create({
        data: {
          name: name,
          contacts: {
            create: contacts // هنا contacts جاية جاهزة مصفوفة objects من الفرونت إند
          }
        }
      });
      return res.status(200).json({ success: true, data: newAudience });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "فشل في حفظ الجمهور" });
    }
  }

  // 3. حذف جمهور (DELETE)
  if (req.method === 'DELETE') {
    const { id } = req.body;
    try {
      await prisma.audience.delete({
        where: { id: id }
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "فشل الحذف" });
    }
  }

  // 4. إضافة رقم واحد لجمهور موجود (PATCH)
  if (req.method === 'PATCH') {
    const { id, number } = req.body;
    try {
      const updatedContact = await prisma.contact.create({
        data: {
          phone: String(number),
          audienceId: id // بيربط الرقم بالجمهور عن طريق الـ ID
        }
      });
      return res.status(200).json(updatedContact);
    } catch (error) {
      return res.status(500).json({ error: "فشل إضافة الرقم" });
    }
  }

  // لو حد بعت Method غير دول
  res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}