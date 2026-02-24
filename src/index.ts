import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import settingsRoutes from "./routes/settings"
import generateRoutes from "./routes/generate"

dotenv.config();

const app = express();
app.use(
  cors({
    origin: ['chrome-extension://ibmnefkeodjglepfahkjpejkjeannjcg'], 
    credentials: true,
  })
);


app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/generate', generateRoutes);

app.get('/', (req, res) => res.send('Backend running'));

const PORT = process.env.PORT || 5000;
console.log('Starting backend...');
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));