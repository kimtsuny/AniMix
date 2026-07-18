"use client";

import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";

export default function TestPage() {
  return (
    <div style={{ width: "100%", maxWidth: 200, margin: "40px auto" }}>
      <Swiper
        slidesPerView={1}
        allowTouchMove
        simulateTouch
      >
        <SwiperSlide>
          <div style={{ height: 200, background: "red" }}>1</div>
        </SwiperSlide>

        <SwiperSlide>
          <div style={{ height: 200, background: "blue" }}>2</div>
        </SwiperSlide>
      </Swiper>
    </div>
  );
}