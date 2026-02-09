import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            Reliable Gas Delivery
            <span className="text-orange-500"> for Your Home</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed">
            Safe, fast, and dependable LPG delivery service. Order online and get your gas delivered to your doorstep within hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/order"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-orange-500 rounded-full hover:bg-orange-600 transition-colors"
            >
              Order Now
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-100 rounded-full blur-3xl opacity-30 -z-10" />
    </section>
  );
}
