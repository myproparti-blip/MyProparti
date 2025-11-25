// src/components/Favorites.jsx
import React from 'react';
import { Empty, Button, Card } from 'antd-mobile';
import { HeartOutline } from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';

const Favorites = () => {
  const navigate = useNavigate();
  
  return (
    <div style={{ padding: '16px', minHeight: '100vh', background: '#f5f5f5' }}>
      <Card>
        <Empty 
          image={<HeartOutline style={{ fontSize: '64px', color: '#ff4d4f' }} />}
          description="No favorites yet"
        />
        <Button 
          color="primary" 
          block 
          style={{ marginTop: '20px' }}
          onClick={() => navigate('/properties')}
        >
          Browse Properties
        </Button>
      </Card>
    </div>
  );
};

export default Favorites;