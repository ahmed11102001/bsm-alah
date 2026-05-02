import { MessageCircle, Mail, Phone, MapPin, Facebook, Instagram } from 'lucide-react';

const footerLinks = {
  product: [
    { label: 'المميزات',   href: '#features' },
    { label: 'كيف يعمل',  href: '#how-it-works' },
    { label: 'الأسعار',   href: '#pricing' },
    { label: 'API',        href: '#' },
  ],
  company: [
    { label: 'من نحن',     href: '#' },
    { label: 'فريق العمل', href: '#' },
    { label: 'الوظائف',    href: '#' },
    { label: 'اتصل بنا',   href: '#' },
  ],
  resources: [
    { label: 'مركز المساعدة',  href: '#' },
    { label: 'المدونة',         href: '#' },
    { label: 'الشروحات',        href: '#' },
    { label: 'الأسئلة الشائعة', href: '#faq' },
  ],
  legal: [
    { label: 'شروط الاستخدام',  href: '/terms' },
    { label: 'سياسة الخصوصية',  href: '/privacy' },
    
  ],
};

const socialLinks = [
  {
    icon: Facebook,
    href: 'https://www.facebook.com/share/14a5gcBMsdg/',
    label: 'فيسبوك',
  },
  {
    icon: Instagram,
    href: 'https://www.instagram.com/r0.0_h?igsh=MWJ2NGo3bGlmY2dscQ==',
    label: 'انستغرام',
  },
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-whatsapp-gradient flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">
                واتس <span className="text-[#25D366]">برو</span>
              </span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              منصتك المتكاملة لإدارة وإرسال رسائل الواتساب. نساعدك على التواصل مع عملائك بكفاءة واحترافية.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-400">
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span>support@whatspro.app</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span dir="ltr">+20 10 0000 0000</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span>الإسكندرية، مصر</span>
              </div>
            </div>
          </div>

          {/* المنتج */}
          <div>
            <h4 className="font-bold text-lg mb-4">المنتج</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-gray-400 hover:text-[#25D366] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* الشركة */}
          <div>
            <h4 className="font-bold text-lg mb-4">الشركة</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-gray-400 hover:text-[#25D366] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* الموارد */}
          <div>
            <h4 className="font-bold text-lg mb-4">الموارد</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-gray-400 hover:text-[#25D366] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* قانوني */}
          <div>
            <h4 className="font-bold text-lg mb-4">قانوني</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-gray-400 hover:text-[#25D366] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © 2025 واتس برو. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-3">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-[#25D366] hover:text-white transition-all duration-200"
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}