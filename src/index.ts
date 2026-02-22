import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';

dotenv.config();

const app = express();
app.use(
  cors({
    origin: ['chrome-extension://ibmnefkeodjglepfahkjpejkjeannjcg'], 
    credentials: true,
  })
);
app.use(cors());

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

app.get('/', (req, res) => res.send('Backend running'));

const PORT = process.env.PORT || 5000;
console.log('Starting backend...');
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));