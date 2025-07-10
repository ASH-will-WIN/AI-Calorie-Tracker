export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { supabase } = await import('../../utils/supabaseClient');

  try {
    // Get user from auth header or session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (req.method === 'GET') {
      // Get user goals
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      // Return default goals if none exist
      const defaultGoals = {
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65,
        fiber: 25,
        sodium: 2300,
        sugar: 50
      };

      res.status(200).json(data || defaultGoals);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { calories, protein, carbs, fat, fiber, sodium, sugar } = req.body;

      // Validate input
      if (!calories || !protein || !carbs || !fat) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (calories < 1000 || calories > 5000) {
        return res.status(400).json({ error: 'Calories must be between 1000 and 5000' });
      }

      if (protein < 20 || protein > 300) {
        return res.status(400).json({ error: 'Protein must be between 20 and 300g' });
      }

      if (carbs < 50 || carbs > 600) {
        return res.status(400).json({ error: 'Carbs must be between 50 and 600g' });
      }

      if (fat < 20 || fat > 150) {
        return res.status(400).json({ error: 'Fat must be between 20 and 150g' });
      }

      const goalData = {
        user_id: user.id,
        calories: parseInt(calories),
        protein: parseInt(protein),
        carbs: parseInt(carbs),
        fat: parseInt(fat),
        fiber: fiber ? parseInt(fiber) : 25,
        sodium: sodium ? parseInt(sodium) : 2300,
        sugar: sugar ? parseInt(sugar) : 50,
        updated_at: new Date().toISOString()
      };

      if (req.method === 'POST') {
        // Create new goals
        const { data, error } = await supabase
          .from('user_goals')
          .insert([goalData])
          .select()
          .single();

        if (error) throw error;
        res.status(201).json(data);
      }

      if (req.method === 'PUT') {
        // Update existing goals
        const { data, error } = await supabase
          .from('user_goals')
          .upsert([goalData])
          .select()
          .single();

        if (error) throw error;
        res.status(200).json(data);
      }
    }
  } catch (error) {
    console.error('Error in user-goals API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 