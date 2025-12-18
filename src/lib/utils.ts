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
