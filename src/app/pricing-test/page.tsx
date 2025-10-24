"use client";

import { useState } from "react";

export default function PricingTestPage() {
  const [numberOfUsers, setNumberOfUsers] = useState(1);

  // Formula: base * (minFraction + discountFraction * exp(-rate * (N - 1)))
  const calculatePricePerUser = (N: number) => {
    // Start price is €7 per user (flat)
    return 7;
  };

  const pricePerUser = calculatePricePerUser(numberOfUsers);
  const totalPrice = pricePerUser * numberOfUsers;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Pricing Formula Test
        </h1>
        
        <div className="space-y-6">
          {/* Formula Display */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Formula:</h3>
            <p className="text-sm text-gray-600 font-mono">
              price per user = base × (minFraction + discountFraction × exp(-rate × (N - 1)))
            </p>
            <div className="mt-2 text-xs text-gray-500">
              <div>base = 10€, minFraction = 0.65, discountFraction = 0.35, rate = 0.02</div>
            </div>
          </div>

          {/* Number of Users Slider */}
          <div>
            <label htmlFor="users-slider" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Users (N): {numberOfUsers}
            </label>
            <input
              id="users-slider"
              type="range"
              min="1"
              max="100"
              value={numberOfUsers}
              onChange={(e) => setNumberOfUsers(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span>100</span>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Results:</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-700">Price per user:</span>
                  <span className="font-semibold text-blue-900">
                    ${pricePerUser.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Total price:</span>
                  <span className="font-semibold text-blue-900">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Mathematical breakdown */}
            <div className="bg-gray-50 p-4 rounded-lg text-xs">
              <h4 className="font-semibold text-gray-700 mb-2">Calculation breakdown:</h4>
              <div className="space-y-1 text-gray-600 font-mono">
                <div>base = 10</div>
                <div>minFraction = 0.65</div>
                <div>discountFraction = 1 - 0.65 = 0.35</div>
                <div>rate = 0.02</div>
                <div>N - 1 = {numberOfUsers - 1}</div>
                <div>-rate × (N - 1) = -0.02 × {numberOfUsers - 1} = {(-0.02 * (numberOfUsers - 1)).toFixed(4)}</div>
                <div>exp({(-0.02 * (numberOfUsers - 1)).toFixed(4)}) = {Math.exp(-0.02 * (numberOfUsers - 1)).toFixed(4)}</div>
                <div>discountFraction × exp(...) = 0.35 × {Math.exp(-0.02 * (numberOfUsers - 1)).toFixed(4)} = {(0.35 * Math.exp(-0.02 * (numberOfUsers - 1))).toFixed(4)}</div>
                <div>minFraction + ... = 0.65 + {(0.35 * Math.exp(-0.02 * (numberOfUsers - 1))).toFixed(4)} = {(0.65 + 0.35 * Math.exp(-0.02 * (numberOfUsers - 1))).toFixed(4)}</div>
                <div>base × ... = 10 × {(0.65 + 0.35 * Math.exp(-0.02 * (numberOfUsers - 1))).toFixed(4)} = ${pricePerUser.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}