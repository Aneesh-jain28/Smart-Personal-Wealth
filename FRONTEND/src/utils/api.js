// This checks if we are on Vercel (using the environment variable) 
// or on your computer (falling back to localhost)
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default BASE_URL;