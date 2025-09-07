// Default avatar URLs
export const DEFAULT_AVATARS = [
  "https://mwnsfvxzxfebddyzbyez.supabase.co/storage/v1/object/public/avatars/defaults/1.png",
  "https://mwnsfvxzxfebddyzbyez.supabase.co/storage/v1/object/public/avatars/defaults/2.png",
  "https://mwnsfvxzxfebddyzbyez.supabase.co/storage/v1/object/public/avatars/defaults/3.png",
  "https://mwnsfvxzxfebddyzbyez.supabase.co/storage/v1/object/public/avatars/defaults/4.png",
  "https://mwnsfvxzxfebddyzbyez.supabase.co/storage/v1/object/public/avatars/defaults/5.png",
  "https://mwnsfvxzxfebddyzbyez.supabase.co/storage/v1/object/public/avatars/defaults/6.png",
  "https://mwnsfvxzxfebddyzbyez.supabase.co/storage/v1/object/public/avatars/defaults/7.png",
  "https://mwnsfvxzxfebddyzbyez.supabase.co/storage/v1/object/public/avatars/defaults/8.png",
  "https://mwnsfvxzxfebddyzbyez.supabase.co/storage/v1/object/public/avatars/defaults/9.png",
  "https://mwnsfvxzxfebddyzbyez.supabase.co/storage/v1/object/public/avatars/defaults/10.png",
]

// Для обратной совместимости
export const defaultAvatars = DEFAULT_AVATARS

/**
 * Returns a random avatar URL from the default avatars list
 */
export function getRandomDefaultAvatar(): string {
  const randomIndex = Math.floor(Math.random() * DEFAULT_AVATARS.length)
  return DEFAULT_AVATARS[randomIndex]
}

/**
 * Checks if the provided URL is one of the default avatars
 */
export function isDefaultAvatar(avatarUrl: string | null): boolean {
  if (!avatarUrl) {
    return false
  }
  return DEFAULT_AVATARS.includes(avatarUrl)
}

/**
 * Returns all default avatar URLs
 */
export function getAllDefaultAvatars(): string[] {
  return DEFAULT_AVATARS
}
