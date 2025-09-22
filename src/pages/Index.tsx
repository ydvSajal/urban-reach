import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, Settings, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 via-blue-700/70 to-blue-800/80" />
        
        <div className="container mx-auto px-4 py-20 sm:py-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-8 animate-fade-in">
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <Building2 className="h-16 w-16 text-white" />
              </div>
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 animate-fade-in">
              Municipal Portal
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in">
              Streamlined municipal services for citizens, workers, and administrators. 
              Report issues, track progress, and manage municipal operations efficiently.
            </p>
          </div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white relative -mt-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900">
              Choose Your Portal
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Access the right tools for your role in municipal services
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Citizen Portal */}
            <Card className="relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border-0 bg-white shadow-xl hover:-translate-y-2">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
              <CardHeader className="pb-6 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-0 px-3 py-1 text-sm font-medium">Citizens</Badge>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Citizen Services</CardTitle>
                <CardDescription className="text-gray-600 text-base leading-relaxed">
                  Report municipal issues, track requests, and access city services with ease
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 text-gray-600 mb-8">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Submit service requests
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Track report status in real-time
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Upload photos and evidence
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Receive instant notifications
                  </li>
                </ul>
                <Link to="/auth/citizen" className="block">
                  <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 transform group-hover:scale-105">
                    Access Citizen Portal
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Worker Portal */}
            <Card className="relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border-0 bg-white shadow-xl hover:-translate-y-2">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
              <CardHeader className="pb-6 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1 text-sm font-medium">Workers</Badge>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Field Operations</CardTitle>
                <CardDescription className="text-gray-600 text-base leading-relaxed">
                  Manage assigned tasks, update work status, and navigate efficiently to locations
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 text-gray-600 mb-8">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    View assigned tasks
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Update work progress
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    GPS navigation to locations
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Upload completion photos
                  </li>
                </ul>
                <Link to="/auth/worker" className="block">
                  <Button variant="outline" className="w-full h-12 border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 font-semibold rounded-xl transition-all duration-200 transform group-hover:scale-105">
                    Access Worker Portal
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Admin Portal */}
            <Card className="relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border-0 bg-white shadow-xl hover:-translate-y-2">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
              <CardHeader className="pb-6 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Settings className="h-8 w-8 text-purple-600" />
                  </div>
                  <Badge className="bg-purple-100 text-purple-800 border-0 px-3 py-1 text-sm font-medium">Admins</Badge>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Administration</CardTitle>
                <CardDescription className="text-gray-600 text-base leading-relaxed">
                  Comprehensive municipal management and oversight tools for administrators
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 text-gray-600 mb-8">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    Manage all reports
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    Assign workers efficiently
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    Generate detailed analytics
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    System administration
                  </li>
                </ul>
                <Link to="/auth/admin" className="block">
                  <Button variant="secondary" className="w-full h-12 bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold rounded-xl transition-all duration-200 transform group-hover:scale-105">
                    Access Admin Portal
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-6">
              <span className="text-sm font-semibold text-blue-800 uppercase tracking-wider">SIH 2025 Hackathon</span>
            </div>
            <h2 className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 bg-clip-text text-transparent">
              Meet Team GlitchFix
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Innovative minds building the future of municipal services through technology and creativity
            </p>
          </div>
          
          <div className="max-w-7xl mx-auto">
            {/* Team Photo */}
            <div className="text-center mb-16">
              <div className="relative inline-block">
                <div className="relative overflow-hidden rounded-3xl shadow-2xl border-8 border-white">
                  <img 
                    src="/team-photo.jpg" 
                    alt="Team GlitchFix at Smart India Hackathon 2025" 
                    className="w-full max-w-4xl h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                </div>
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-lg border-4 border-blue-100">
                  <span className="text-blue-600 font-bold text-lg">Team GlitchFix</span>
                </div>
              </div>
            </div>

            {/* Team Members Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {/* Team Lead - Sajal */}
              <div className="text-center group">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 mx-auto relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse opacity-20"></div>
                    <div className="absolute inset-1 bg-white rounded-full shadow-2xl overflow-hidden">
                      <img 
                        src="/team-lead.png" 
                        alt="Sajal - Team Lead" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white text-xs font-bold">👑</span>
                    </div>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Sajal</h4>
                  <p className="text-blue-600 font-semibold">Team Lead</p>
                  <div className="w-12 h-0.5 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto mt-2 rounded-full"></div>
                </div>
              </div>

              {/* Other Team Members */}
              {[
                { name: "Devansh", role: "Full Stack Developer", image: "/devansh.jpg" },
                { name: "Raghav", role: "Backend Engineer", image: "/raghav.jpg" },
                { name: "Prateek", role: "Frontend Developer", image: "/prateek.png" },
                { name: "Jitesh", role: "DevOps Engineer", image: "/jitesh.jpg" },
                { name: "Sakshi", role: "UI/UX Designer", image: "/sakshi.jpg" }
              ].map((member, index) => (
                <div key={member.name} className="text-center group">
                  <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 mx-auto relative">
                      {/* Animated ring */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                      
                      {member.image ? (
                        /* Real photo */
                        <div className="absolute inset-1 bg-white rounded-full shadow-2xl overflow-hidden">
                          <img 
                            src={member.image} 
                            alt={`${member.name} - ${member.role}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        /* Placeholder avatar */
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-full border-4 border-white shadow-lg flex items-center justify-center group-hover:shadow-xl transition-shadow duration-300">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {member.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Coming soon badge for members without photos */}
                      {!member.image && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white text-xs">📷</span>
                        </div>
                      )}
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h4>
                    <p className="text-gray-600 font-medium">{member.role}</p>
                    <div className="w-12 h-0.5 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto mt-2 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Team Stats */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 px-8 py-6">
                <h3 className="text-2xl font-bold text-white text-center">Project Highlights</h3>
              </div>
              <div className="p-8">
                <div className="grid md:grid-cols-3 gap-8 text-center">
                  <div className="group">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Building2 className="h-8 w-8 text-blue-600" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Municipal Portal</h4>
                    <p className="text-gray-600">Comprehensive civic management system</p>
                  </div>
                  <div className="group">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Multi-Role Access</h4>
                    <p className="text-gray-600">Citizen, Worker & Admin portals</p>
                  </div>
                  <div className="group">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Settings className="h-8 w-8 text-purple-600" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Smart Features</h4>
                    <p className="text-gray-600">Real-time tracking & notifications</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-blue-600 mr-2" />
            <span className="text-gray-900 font-semibold">Municipal Portal by Team GlitchFix</span>
          </div>
          <p className="text-gray-600">
            © 2025 Municipal Portal. Streamlining city services for everyone.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Developed for Smart India Hackathon 2025
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;