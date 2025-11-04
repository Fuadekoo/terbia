/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { Star, User, Calendar } from "lucide-react";
import {
  addFeedback,
  getFeedback,
  getAverageRating,
} from "@/actions/student/courseData";
// import useData from "@/hooks/useData";
import useAction from "@/hooks/useAction";

export default function CourseFeedback({
  studentId,
  courseId,
  lang,
  themeColors,
}: {
  studentId: number;
  courseId: string;
  lang: string;
  themeColors?: {
    bg: string;
    text: string;
    hint: string;
    link: string;
    button: string;
    buttonText: string;
    secondaryBg: string;
  };
}) {
  // Use Telegram theme colors or defaults
  const bgColor = themeColors?.bg || "#ffffff";
  const textColor = themeColors?.text || "#000000";
  const hintColor = themeColors?.hint || "#6b7280";
  const linkColor = themeColors?.link || "#0ea5e9";
  const buttonColor = themeColors?.button || "#0ea5e9";
  const buttonTextColor = themeColors?.buttonText || "#ffffff";
  const secondaryBg = themeColors?.secondaryBg || "#f3f4f6";

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [feedbacks, refreshFeedback, feedbacksLoading] = useAction(
    getFeedback,
    [true, () => {}],
    courseId
  );

  const [averageRating, , ratingLoading] = useAction(
    getAverageRating,
    [true, () => {}],
    courseId
  );

  const [, action, submitting] = useAction(addFeedback, [, () => {}]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating > 0 && comment.trim()) {
      await action(courseId, studentId, comment, rating);
      refreshFeedback();
      setRating(0);
      setComment("");
      setIsEditing(false);
    }
  };
  
  const userFeedback = feedbacks?.find((f: any) => f.studentId === studentId);
  
  const handleEdit = () => {
    if (userFeedback) {
      setRating(userFeedback.rating);
      setComment(userFeedback.feedback);
      setIsEditing(true);
    }
  };

  const renderStars = (ratingValue: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= ratingValue
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            } ${
              interactive
                ? "cursor-pointer hover:fill-yellow-400 hover:text-yellow-400"
                : ""
            }`}
            onClick={interactive ? () => setRating(star) : undefined}
            onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
          />
        ))}
      </div>
    );
  };

  if (feedbacksLoading || ratingLoading) {
    return (
      <div 
        className="flex items-center justify-center h-64"
        style={{ background: bgColor }}
      >
        <div 
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: linkColor }}
        ></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" style={{ background: bgColor }}>
      {/* Feedback Form */}
      <div 
        className="rounded-xl border p-6 shadow-sm"
        style={{ 
          background: secondaryBg,
          borderColor: `${hintColor}40`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4"
          style={{ color: textColor }}
        >
          {lang === "en" ? "Share Your Feedback" : "ግብረመልስዎን ያጋሩ"}
        </h3>

        {/* Average Rating Display */}
        {averageRating && averageRating.count > 0 && (
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{ background: `${linkColor}15` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: hintColor }}>
                  {lang === "en" ? "Average Rating" : "የመካከለኛ ደረጃ"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {renderStars(Math.round(averageRating.average))}
                  <span 
                    className="text-lg font-bold"
                    style={{ color: textColor }}
                  >
                    {averageRating.average.toFixed(1)}
                  </span>
                  <span className="text-sm" style={{ color: hintColor }}>
                    ({averageRating.count}{" "}
                    {lang === "en" ? "reviews" : "ግምገማዎች"})
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textColor }}
            >
              {lang === "en" ? "Your Rating" : "የእርስዎ ደረጃ"}
            </label>
            <div className="flex items-center gap-2">
              {renderStars(hoverRating || rating, true)}
              <span className="ml-2 text-sm" style={{ color: hintColor }}>
                {rating > 0
                  ? `${rating} ${lang === "en" ? "star" : "ኮከብ"}${
                      rating > 1 ? "s" : ""
                    }`
                  : lang === "en"
                  ? "Select rating"
                  : "ደረጃ ይምረጡ"}
              </span>
            </div>
          </div>

          <div>
            <label 
              htmlFor="comment" 
              className="block text-sm font-medium mb-2"
              style={{ color: textColor }}
            >
              {lang === "en" ? "Your Feedback" : "ግብረመልስዎ"}
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 transition-colors"
              style={{
                background: bgColor,
                color: textColor,
                borderColor: hintColor,
              }}
              placeholder={
                lang === "en"
                  ? "Share your thoughts about this course..."
                  : "ስለዚህ ኮርስ አስተያየትዎን ያጋሩ..."
              }
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || rating === 0 || !comment.trim()}
              className="px-4 py-2 rounded-lg focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{
                background: buttonColor,
                color: buttonTextColor,
              }}
            >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: buttonTextColor }}
                ></div>
                {lang === "en" ? "Submitting..." : "በመስቀል ላይ..."}
              </span>
            ) : userFeedback && !isEditing ? (
              lang === "en" ? "Update Feedback" : "ግብረመልስ አዘምን"
            ) : lang === "en" ? (
              "Submit Feedback"
            ) : (
              "ግብረመልስ ይስቀሉ"
            )}
            </button>
            {userFeedback && !isEditing && (
              <button
                type="button"
                onClick={handleEdit}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  background: secondaryBg,
                  color: textColor,
                }}
              >
                {lang === "en" ? "Edit" : "አርም"}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Feedback List - Displayed below the form */}
      {feedbacks && feedbacks.length > 0 && (
        <div>
          <h3 
            className="text-lg font-semibold mb-2"
            style={{ color: textColor }}
          >
            {lang === "en" ? "Student Feedback" : "Student Feedback"}
          </h3>
          <div className="space-y-2">
            {feedbacks.map((feedback: any) => (
              <div
                key={feedback.id}
                className="rounded-lg border p-3 shadow-sm"
                style={{ 
                  background: secondaryBg,
                  borderColor: `${hintColor}40`
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: `${linkColor}20` }}
                    >
                      <User className="w-4 h-4" style={{ color: linkColor }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 
                          className="font-medium text-sm"
                          style={{ color: textColor }}
                        >
                          {feedback.user
                            ? `${feedback.user.firstName} ${feedback.user.fatherName}`
                            : lang === "en"
                            ? "Anonymous"
                            : "Anonymous"}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {renderStars(feedback.rating)}
                          <div 
                            className="flex items-center gap-1 text-xs"
                            style={{ color: hintColor }}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(feedback.createdAt).toLocaleDateString(
                                lang === "en" ? "en-US" : "am-ET",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p 
                      className="mt-2 text-sm whitespace-pre-wrap"
                      style={{ color: textColor }}
                    >
                      {feedback.feedback}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
