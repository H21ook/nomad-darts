import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const bogieNumbers = [169, 168, 166, 165, 163, 162, 159];

export const checkFinishablePoint = (currentScore: number) => {
  return (
    currentScore <= 170 &&
    currentScore >= 2 &&
    !bogieNumbers.includes(currentScore)
  );
};

export const PLAYER_COLORS = [
  "#22d3ee", // Cyan 400
  "#818cf8", // Indigo 400
  "#f472b6", // Pink 400
  "#fbbf24", // Amber 400
  "#34d399", // Emerald 400
  "#a78bfa", // Violet 400
  "#fb7185", // Rose 400
  "#38bdf8", // Sky 400
  "#c084fc", // Purple 400
  "#facc15", // Yellow 400
];

export const getRandomPlayerColor = (excludeColors: string[] = []) => {
  const availableColors = PLAYER_COLORS.filter(
    (c) => !excludeColors.includes(c)
  );
  const colors = availableColors.length > 0 ? availableColors : PLAYER_COLORS;
  return colors[Math.floor(Math.random() * colors.length)];
};
