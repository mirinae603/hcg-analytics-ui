import React from "react";
import styled, { keyframes } from "styled-components";

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Overlay = styled.div`
  position: fixed;
  z-index: 9999;
  inset: 0;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Spinner = styled.div`
  width: 60px;
  height: 60px;
  border: 6px solid #cce7f8;
  border-top: 6px solid #4bb8ff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoaderOverlay = () => (
  <Overlay>
    <Spinner />
  </Overlay>
);

export default LoaderOverlay;
