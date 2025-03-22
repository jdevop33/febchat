import { motion } from 'framer-motion';
import { BylawWelcome } from '@/components/bylaw/bylaw-welcome';

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="mx-auto w-full"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.3 }}
    >
      <BylawWelcome />
    </motion.div>
  );
};
