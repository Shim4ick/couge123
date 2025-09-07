import type React from "react"
import type { ReactNode } from "react"

export type BadgeType = "founder" | "staff" | "beta"

interface BadgeProps {
  type: BadgeType
}

export function Badge({ type }: BadgeProps) {
  const getBadgeContent = (): { icon: ReactNode; label: string } => {
    switch (type) {
      case "founder":
        return {
          icon: (
            <svg width="16" height="16" viewBox="0 0 171 171" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M41.5018 39.5C41.5018 39.5 84.0011 79.334 85.3344 79.334C86.6677 79.334 129.001 39 129.001 39C130.002 39 109.767 39 85.5008 39C36 39 41 38.5 41.5018 39.5Z"
                fill="url(#paint0_linear_391_24)"
              />
              <path
                d="M115.436 62.9025L89 87.2193V117.5C89 134.3 89 148 89 148C89.2667 148 101.969 136.369 116.369 122.103L141.837 96.1025V68.251C142.001 52.5 142.001 39 142.001 39C141.734 39 129.836 49.5692 115.436 62.9025Z"
                fill="url(#paint1_linear_391_24)"
              />
              <path
                d="M28.0026 67.5991V95.3325L54.2693 121.732C69 135.999 81.7359 148.234 81.7359 148C81.7359 147.5 81.7359 132.5 81.7359 115.999V87.219L70.1359 76.3991C64.1359 71.0658 52.8027 60.7991 44.6693 53.3325C36.4991 45.9998 28.0002 38.9998 28.0002 38.9998C28.0002 38.9998 27.9991 52.4998 28.0026 67.5991Z"
                fill="url(#paint2_linear_391_24)"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_391_24"
                  x1="85.3002"
                  y1="39.4969"
                  x2="85.3002"
                  y2="79.334"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#F4B810" />
                  <stop offset="1" stopColor="#A66913" />
                </linearGradient>
                <linearGradient
                  id="paint1_linear_391_24"
                  x1="115.999"
                  y1="38.999"
                  x2="115.999"
                  y2="147.999"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#F4B810" />
                  <stop offset="1" stopColor="#A66913" />
                </linearGradient>
                <linearGradient
                  id="paint2_linear_391_24"
                  x1="54.9423"
                  y1="40.001"
                  x2="54.9423"
                  y2="148.019"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#F4B810" />
                  <stop offset="1" stopColor="#A66913" />
                </linearGradient>
              </defs>
            </svg>
          ),
          label: "Couge Founder",
        }
      case "staff":
        return {
          icon: (
            <svg width="16" height="16" viewBox="0 0 171 171" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M41.5018 39.5C41.5018 39.5 84.0011 79.334 85.3344 79.334C86.6677 79.334 129.001 39 129.001 39C130.002 39 109.767 39 85.5008 39C36 39 41 38.5 41.5018 39.5Z"
                fill="url(#paint0_linear_408_2)"
              />
              <path
                d="M115.436 62.9025L89 87.2193V117.5C89 134.3 89 148 89 148C89.2667 148 101.969 136.369 116.369 122.103L141.837 96.1025V68.251C142.001 52.5 142.001 39 142.001 39C141.734 39 129.836 49.5692 115.436 62.9025Z"
                fill="url(#paint1_linear_408_2)"
              />
              <path
                d="M28.0026 67.5991V95.3325L54.2693 121.732C69 135.999 81.7359 148.234 81.7359 148C81.7359 147.5 81.7359 132.5 81.7359 115.999V87.219L70.1359 76.3991C64.1359 71.0658 52.8027 60.7991 44.6693 53.3325C36.4991 45.9998 28.0002 38.9998 28.0002 38.9998C28.0002 38.9998 27.9991 52.4998 28.0026 67.5991Z"
                fill="url(#paint2_linear_408_2)"
              />
              <path
                d="M134.12 131.593L150.12 147.593L155.747 141.833L139.747 125.833L134.12 131.593ZM144.04 117.727C143 117.727 141.88 117.593 141 117.22L110.627 147.46L105 141.833L124.76 122.1L120.04 117.353L118.12 119.22L114.253 115.46V123.087L112.387 124.953L103 115.46L104.867 113.593H112.36L108.627 109.833L118.12 100.34C121.24 97.22 126.253 97.22 129.373 100.34L123.747 106.1L127.507 109.833L125.613 111.727L130.387 116.473L135.24 111.46C134.867 110.58 134.707 109.46 134.707 108.473C134.707 103.22 138.867 99.0867 144.04 99.0867C145.613 99.0867 147 99.46 148.253 100.207L141.133 107.327L145.133 111.327L152.253 104.207C153 105.46 153.373 106.793 153.373 108.473C153.373 113.593 149.24 117.727 144.04 117.727Z"
                fill="url(#paint3_linear_408_2)"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_408_2"
                  x1="85.3002"
                  y1="39.4969"
                  x2="85.3002"
                  y2="79.334"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#CFCFCF" />
                  <stop offset="1" stopColor="#DD95FF" />
                </linearGradient>
                <linearGradient
                  id="paint1_linear_408_2"
                  x1="115.999"
                  y1="38.999"
                  x2="115.999"
                  y2="147.999"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#CFCFCF" />
                  <stop offset="1" stopColor="#DD95FF" />
                </linearGradient>
                <linearGradient
                  id="paint2_linear_408_2"
                  x1="54.9423"
                  y1="40.001"
                  x2="54.9423"
                  y2="148.019"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#CFCFCF" />
                  <stop offset="1" stopColor="#DD95FF" />
                </linearGradient>
                <linearGradient
                  id="paint3_linear_408_2"
                  x1="129.373"
                  y1="98"
                  x2="129.373"
                  y2="147.593"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#D8D8D8" />
                  <stop offset="1" stopColor="#727272" />
                </linearGradient>
              </defs>
            </svg>
          ),
          label: "Couge Staff",
        }
      case "beta":
        return {
          icon: (
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.2333 5.03932C10.0317 5.10027 9.83952 5.21747 9.70825 5.35812C9.58635 5.4894 4.18541 14.8567 4.06351 15.152C3.98381 15.3396 3.97912 15.8131 4.04945 16.0006C4.07758 16.0709 5.33405 18.2838 6.84837 20.9093C8.7237 24.163 9.65668 25.7476 9.78326 25.8695C10.1255 26.2071 9.78795 26.193 16.1219 26.1789L21.79 26.1649L21.9776 26.0617C22.0807 26.0102 22.2214 25.9023 22.2917 25.8273C22.4136 25.7007 27.8145 16.3241 27.9411 16.0287C28.0302 15.8084 28.0161 15.3255 27.913 15.1004C27.8661 14.9973 26.6003 12.7797 25.1 10.1777C23.159 6.8115 22.3245 5.40032 22.2026 5.2878C21.8604 4.98306 22.137 4.99712 15.9578 5.00181C12.8729 5.00181 10.299 5.02057 10.2333 5.03932Z"
                fill="url(#paint0_linear_391_5)"
              />
              <path
                d="M14.6025 19.7217V23.502H12.9961V12.291C12.9961 11.2998 13.29 10.5205 13.8711 9.93945C14.4453 9.3584 15.2451 9.06445 16.2295 9.06445C17.1797 9.06445 17.9111 9.29687 18.458 9.74805C18.998 10.2129 19.2646 10.8555 19.2646 11.6689C19.2646 12.2295 19.0869 12.7559 18.7314 13.2412C18.376 13.7266 17.918 14.0615 17.3506 14.2461V14.2734C18.2051 14.4102 18.8682 14.7178 19.3193 15.2168C19.7705 15.7021 19.9961 16.3242 19.9961 17.0898C19.9961 17.9922 19.6816 18.7305 19.0596 19.2979C18.4307 19.8652 17.6104 20.1455 16.585 20.1455C15.8604 20.1455 15.1973 20.002 14.6025 19.7217ZM15.6211 15.0459V13.7334C16.2158 13.6582 16.7012 13.4395 17.0908 13.0703C17.4736 12.6943 17.665 12.2773 17.665 11.7988C17.665 10.8555 17.1797 10.377 16.2227 10.377C15.7031 10.377 15.2998 10.541 15.0195 10.876C14.7393 11.2109 14.6025 11.6758 14.6025 12.2842V18.293C15.2246 18.6553 15.833 18.833 16.4209 18.833C16.9951 18.833 17.4463 18.6826 17.7676 18.3887C18.0889 18.0879 18.2461 17.6641 18.2461 17.124C18.2461 15.9004 17.3711 15.2168 15.6211 15.0459Z"
                fill="white"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_391_5"
                  x1="16"
                  y1="26.1846"
                  x2="16"
                  y2="5.00018"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#A219A5" />
                  <stop offset="1" stopColor="#1765BE" />
                </linearGradient>
              </defs>
            </svg>
          ),
          label: "Beta Member",
        }
      default:
        return {
          icon: null,
          label: "",
        }
    }
  }

  const { icon, label } = getBadgeContent()

  return (
    <div className="relative group">
      <div className="w-4 h-4 flex items-center justify-center">{icon}</div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="bg-black px-2 py-1 rounded text-xs text-white whitespace-nowrap">{label}</div>
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black absolute left-1/2 -translate-x-1/2"></div>
      </div>
    </div>
  )
}

export function BadgeContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1 bg-neutral-700 bg-opacity-50 rounded-md px-2 py-1">{children}</div>
  )
}
