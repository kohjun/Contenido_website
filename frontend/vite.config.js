import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()], // react 플러그인 설정
  server: {
    proxy: {
      '/api': 'http://localhost:3000', // API 요청을 Node.js 서버로 프록시
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});

// export default defineConfig({
  
  
// plugins: [react()],  // 기본 서버 
// });