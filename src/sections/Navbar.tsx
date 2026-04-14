import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Menu, X, User } from 'lucide-react';

interface NavbarProps {
  onLoginClick: () => void;
}

const navItems = [
  { label: 'المميزات', href: '#features' },
  { label: 'كيف يعمل', href: '#how-it-works' },
  { label: 'الأسعار', href: '#pricing' },
  { label: 'آراء العملاء', href: '#testimonials' },
  { label: 'الأسئلة الشائعة', href: '#faq' },
];

export default function Navbar({ onLoginClick }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-whatsapp-gradient flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className={`text-xl font-bold ${isScrolled ? 'text-gray-900' : 'text-gray-900 lg:text-white'}`}>
              واتس <span className="text-[#25D366]">برو</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToSection(item.href)}
                className={`text-sm font-medium transition-colors hover:text-[#25D366] ${
                  isScrolled ? 'text-gray-700' : 'text-white/90'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Login Button */}
          <div className="hidden lg:block">
            <Button
              onClick={onLoginClick}
              className="bg-whatsapp-gradient hover:opacity-90 text-white px-6"
            >
              <User className="w-4 h-4 ml-2" />
              تسجيل الدخول
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg ${
              isScrolled ? 'text-gray-900' : 'text-gray-900 lg:text-white'
            }`}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t shadow-lg">
          <div className="px-4 py-4 space-y-3">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToSection(item.href)}
                className="block w-full text-right py-2 text-gray-700 hover:text-[#25D366] font-medium"
              >
                {item.label}
              </button>
            ))}
            <Button
              onClick={onLoginClick}
              className="w-full bg-whatsapp-gradient hover:opacity-90 text-white mt-4"
            >
              <User className="w-4 h-4 ml-2" />
              تسجيل الدخول
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
