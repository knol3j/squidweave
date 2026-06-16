import Navbar from './components/Navbar';
import Hero from './sections/Hero';
import Problem from './sections/Problem';
import Solution from './sections/Solution';
import Capabilities from './sections/Capabilities';
import Competitive from './sections/Competitive';
import Traction from './sections/Traction';
import Pricing from './sections/Pricing';
import Footer from './sections/Footer';

function App() {
  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
      <Capabilities />
      <Competitive />
      <Traction />
      <Pricing />
      <Footer />
    </div>
  );
}

export default App;
