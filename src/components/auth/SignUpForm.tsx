"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import {DASHBOARD_API_BASE_URL} from '@/utils/config';

export default function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRedirectLoader, setShowRedirectLoader] = useState(false);


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');

  const formData = new FormData(e.currentTarget);
  const userData = {
    firstName: formData.get('fname') as string,
    lastName: formData.get('lname') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  // Basic validation
  if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
    setError('Please fill in all fields');
    setLoading(false);
    return;
  }

  try {
    const response = await fetch(`${DASHBOARD_API_BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (response.ok) {
      const data = await response.json();
      setSuccess('Account Created successfully! Redirecting to sign in...');
      setShowRedirectLoader(true);
      setTimeout(() => {
        router.push('/signin');
      }, 2000);
    } else {
      const errorData = await response.json();
      setError(errorData.detail || 'Signup failed');
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      setError('Network error. Please try again.');
    } else {
      setError('An unexpected error occurred.');
    }
  } finally {
    setLoading(false);
  }
};


  return (
    <>
    {showRedirectLoader && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-100 backdrop-blur-sm">
    <div className="flex flex-col items-center space-y-6">
      {/* Animated Logo/Icon */}
      <div className="relative">
        <div className="w-20 h-20 border-4 border-red-200 rounded-full animate-spin border-t-red-400"></div>
        <div className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-ping border-t-red-300 opacity-75"></div>
      </div>
      
      {/* Loading Text */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-2 animate-bounce">Success!</h2>
        <p className="text-gray-600 animate-pulse">Redirecting to sign in...</p>
      </div>
      
      {/* Animated Dots */}
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
      </div>
    </div>
  </div>
)}
    <div className="flex flex-col bg-gradient-to-br from-slate-100/30 via-white to-blue-100/20 flex-1 lg:w-1/2 w-full">
      {/* Full Screen Redirect Loader */}

      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Back to dashboard
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
           <div className="mb-3 max-w-md mx-auto text-left relative">
  <h1 className="mb-5 font-bold text-red-300 text-3xl sm:text-4xl tracking-wide leading-tight">
    Sign Up
  </h1>
  <div className="absolute left-0 top-10 w-7 h-1 rounded-full bg-gradient-to-r from-red-200 via-red-300 to-red-400 opacity-70"></div>
  <p className="mt-3 text-gray-400 dark:text-gray-400 text-sm sm:text-base max-w-sm leading-relaxed font-small">
    Add Your Name, Email Id and Password and Journey Begins !
  </p>
</div>
          <div>
           
            <div className="relative py-3 sm:py-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="p-2 mb-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2">
                  Create Account
                </span>
              </div>
            </div>
            
            {/* Error/Success Messages */}
            {error && (
              <div
    role="alert"
    className="mb-4 flex items-start gap-3 rounded-lg bg-red-50 px-5 py-3 text-sm text-red-400 shadow-sm opacity-100 animate-[fadeIn_0.6s_ease-in-out]"
  >
    <svg
      className="h-6 w-6 flex-shrink-0 text-red-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="7" x2="12" y2="13" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
    <p className="flex-1 leading-relaxed font-semibold tracking-wide">{error}</p>
  </div>
            )}
            {success && (
              <div
  role="alert"
  className="mb-4 flex items-start gap-3 rounded-lg bg-green-50 px-5 py-3 text-sm text-green-600 shadow-sm opacity-100 animate-[fadeIn_0.6s_ease-in-out]"
>
  <svg
    className="h-6 w-6 flex-shrink-0 text-green-600"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
  </svg>
  <p className="flex-1 leading-relaxed font-semibold tracking-wide">{success}</p>
</div>

            )}
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    
                    <Label className="text-sm font-medium text-slate-500 mb-2 block">
                First Name<span className="ml-2 text-error-400">*</span>
              </Label>
                    <input
                      type="text"
                      name="fname"
                      placeholder="Enter your first name"
                      className="w-full px-4 py-3 border border-blue-200/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-200/20 focus:border-blue-200 transition-all duration-300 bg-white/70 backdrop-blur-sm text-slate-900 placeholder-slate-400 shadow-sm hover:shadow-md  hover:border-slate-300/80 group-hover:bg-white/90"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Label className="text-sm font-medium text-slate-500 mb-2 block">
                Last Name
              </Label>
                    <input
                      type="text"
                      name="lname"
                      placeholder="Enter your last name"
                      className="w-full px-4 py-3 border border-blue-200/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-200/20 focus:border-blue-200 transition-all duration-300 bg-white/70 backdrop-blur-sm text-slate-900 placeholder-slate-400 shadow-sm hover:shadow-md  hover:border-slate-300/80 group-hover:bg-white/90"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-500 mb-2 block">
                Email Address<span className="ml-2 text-error-400">*</span>
              </Label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border border-blue-200/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-200/20 focus:border-blue-200 transition-all duration-300 bg-white/70 backdrop-blur-sm text-slate-900 placeholder-slate-400 shadow-sm hover:shadow-md  hover:border-slate-300/80 group-hover:bg-white/90"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-500 mb-2 block">
                Password<span className="ml-2 text-error-400">*</span>
              </Label>
                  <div className="relative">
                    <input
                      name="password"
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      className="w-full px-4 py-3 border border-blue-200/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-200/20 focus:border-blue-200 transition-all duration-300 bg-white/70 backdrop-blur-sm text-slate-900 placeholder-slate-400 shadow-sm hover:shadow-md  hover:border-slate-300/80 group-hover:bg-white/90"
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                {/* <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    By creating an account means you agree to the{" "}
                    <span className="text-gray-800 dark:text-white/90">
                      Terms and Conditions,
                    </span>{" "}
                    and our{" "}
                    <span className="text-gray-800 dark:text-white">
                      Privacy Policy
                    </span>
                  </p>
                </div> */}
                <div>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="relative w-full px-7 py-4 text-md font-bold text-gray-500/70 bg-red-200/70  rounded-2xl overflow-hidden backdrop-blur-md shadow-[0_4px_20px_rgba(248,113,113,0.2)]  hover:scale-[1.015] active:scale-100 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating Account...' : 'Sign Up'}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm text-center sm:text-start text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  href="/signin"
                  className="relative ml-1 font-medium text-red-400 dark:text-red-300 hover:text-red-300 dark:hover:text-red-200 transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-[1.5px] after:w-0 after:bg-current after:transition-all after:duration-300 hover:after:w-full"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
