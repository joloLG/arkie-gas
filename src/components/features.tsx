import { Clock, Shield, Truck } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Get your gas delivered within 2 hours. We prioritize speed without compromising safety.",
  },
  {
    icon: Shield,
    title: "Safe & Certified",
    description: "All our cylinders are certified and inspected. Safety is our top priority for every delivery.",
  },
  {
    icon: Clock,
    title: "24/7 Service",
    description: "Need gas at midnight? No problem. We're available round the clock for your convenience.",
  },
];

export function Features() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Arkie Gasul?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We provide the best gas delivery service with a focus on safety, speed, and customer satisfaction.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <feature.icon className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
