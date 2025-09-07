"use client"

import { ArrowUpRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MobileUnavailable() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-gray-200 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="purple-orb-1"></div>
        <div className="purple-orb-2"></div>
        <div className="purple-orb-3"></div>
      </div>
      <div className="w-full max-w-md space-y-8 text-center relative z-10">
        <div className="p-6 bg-black/40 backdrop-blur-xl rounded-2xl space-y-6 shadow-2xl border border-gray-200/20">
          <AlertTriangle className="w-16 h-16 mx-auto text-purple-400" />
          <h2 className="text-2xl font-bold text-white">A mobile version is in development</h2>
          <p className="text-gray-300 text-base">
            Sorry, Couge is not available on mobile devices yet. Follow the news so you don't miss the exit.
            the mobile version!
          </p>
          <Button
            className="w-full bg-purple-700 text-white hover:bg-purple-600 transition-colors duration-300"
            onClick={() => (window.location.href = "https://joincouge.com")}
          >
            Go back to the main page
            <ArrowUpRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
      <style jsx>{`
        @keyframes float {
          0% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          25% { transform: translate(10%, 10%) scale(1.05); opacity: 0.45; }
          50% { transform: translate(15%, -10%) scale(1); opacity: 0.4; }
          75% { transform: translate(-10%, 10%) scale(0.95); opacity: 0.45; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
        }
        .purple-orb-1, .purple-orb-2, .purple-orb-3 {
          position: absolute;
          width: 100vh;
          height: 100vh;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.4;
          transition: all 0.8s ease;
        }
        .purple-orb-1 {
          background: radial-gradient(circle, rgba(147, 51, 234, 0.4) 0%, rgba(147, 51, 234, 0) 70%);
          top: -30%;
          left: -20%;
          animation: float 30s ease-in-out infinite;
        }
        .purple-orb-2 {
          background: radial-gradient(circle, rgba(88, 28, 135, 0.4) 0%, rgba(88, 28, 135, 0) 70%);
          bottom: -20%;
          right: -20%;
          animation: float 35s ease-in-out infinite reverse;
        }
        .purple-orb-3 {
          background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0) 70%);
          top: 20%;
          left: 10%;
          animation: float 40s ease-in-out infinite;
        }
        @media (max-width: 768px) {
          .purple-orb-1, .purple-orb-2, .purple-orb-3 {
            width: 130vh;
            height: 130vh;
            filter: blur(80px);
            opacity: 0.45;
          }
          .purple-orb-1 {
            background: radial-gradient(circle, rgba(147, 51, 234, 0.45) 0%, rgba(147, 51, 234, 0) 75%);
          }
          .purple-orb-2 {
            background: radial-gradient(circle, rgba(88, 28, 135, 0.45) 0%, rgba(88, 28, 135, 0) 75%);
          }
          .purple-orb-3 {
            background: radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(168, 85, 247, 0) 75%);
          }
        }
      `}</style>
    </div>
  )
}
