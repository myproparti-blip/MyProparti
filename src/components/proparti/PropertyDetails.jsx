// src/components/PropertyDetails.jsx
// src/components/PropertyDetails.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Image,
  Tag,
  Button,
  Space,
  Grid,
  Divider,
  Toast,
  SpinLoading,
  Modal,
  Avatar,
  Swiper,
} from 'antd-mobile';
import {
  EnvironmentOutline,
  PhoneFill,
  MessageOutline,
  LeftOutline,
  SendOutline,
  UserOutline,
  CalendarOutline,
  PlayCircleOutline,
  RightOutline,
  LeftOutline as LeftIcon,
} from 'antd-mobile-icons';
import { useParams, useNavigate } from 'react-router-dom';
import { getPropertyById } from '../../services/properties';
import { getProfile } from '../../services/auth';

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideo, setCurrentVideo] = useState('');
  const swiperRef = useRef(null);

  useEffect(() => {
    fetchPropertyDetails();
    fetchCurrentUser();
  }, [id]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      const res = await getPropertyById(id);
      if (res.success) {
        setProperty(res.data);
      } else {
        Toast.show(res.error || 'Property not found');
        navigate('/PropertyListing');
      }
    } catch (error) {
      console.error('Error loading property:', error);
      Toast.show('Error loading property details');
      navigate('/PropertyListing');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await getProfile();
      if (res.success) {
        setCurrentUser(res.data.user);
      }
    } catch (error) {
      console.log('Error fetching user profile');
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Price on request';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShareProperty = async () => {
    const shareUrl = window.location.href;
    const shareText = `Check out this property: ${property?.title} - ${formatPrice(property?.price)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  const handleCallOwner = () => {
    if (property.owner?.phone) {
      window.open(`tel:${property.owner.phone}`);
    } else {
      Toast.show('Phone number not available');
    }
  };

  const handleMessageOwner = () => {
    if (property.owner?.phone) {
      const message = `Hi, I'm interested in your property: ${property.title} - ${formatPrice(property.price)}`;
      window.open(`https://wa.me/${property.owner.phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      Toast.show('Phone number not available for messaging');
    }
  };

  const openVideoModal = (videoUrl) => {
    setCurrentVideo(videoUrl);
    setVideoModalVisible(true);
  };

  // Combine images and videos for the swiper
  const getMediaItems = () => {
    const items = [];
    
    // Add images
    if (property.images && property.images.length > 0) {
      property.images.forEach((image, index) => {
        items.push({
          type: 'image',
          url: image,
          key: `image-${index}`
        });
      });
    }
    
    // Add videos
    if (property.videos && property.videos.length > 0) {
      property.videos.forEach((video, index) => {
        items.push({
          type: 'video',
          url: video,
          key: `video-${index}`
        });
      });
    }
    
    return items;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <SpinLoading color="primary" style={{ '--size': '48px', marginBottom: '16px' }} />
          <p style={{ color: '#666' }}>Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        background: '#f8f9fa',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h3 style={{ marginBottom: '20px', color: '#333' }}>Property not found</h3>
        <Button 
          color="primary" 
          fill="solid"
          onClick={() => navigate('/PropertyListing')}
        >
          Back to Properties
        </Button>
      </div>
    );
  }

  const mediaItems = getMediaItems();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8f9fa',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        background: 'white',
        padding: '16px',
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          maxWidth: '100%'
        }}>
          <Button 
            fill="none" 
            onClick={() => navigate(-1)}
            style={{ 
              color: '#333', 
              border: '1px solid #e0e0e0',
              flexShrink: 0
            }}
          >
            <LeftOutline />
          </Button>
          <h2 style={{ 
            margin: 0, 
            fontSize: '18px', 
            flex: 1, 
            color: '#333',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Property Details
          </h2>
          <Button 
            fill="none" 
            onClick={handleShareProperty}
            style={{ 
              color: '#333', 
              border: '1px solid #e0e0e0',
              flexShrink: 0
            }}
          >
            <SendOutline />
          </Button>
        </div>
      </div>

      {/* Modern Media Gallery with Swiper */}
      <div style={{ 
        height: '350px', 
        position: 'relative', 
        background: '#f5f5f5',
        overflow: 'hidden'
      }}>
        {mediaItems.length > 0 ? (
          <>
            <Swiper
              ref={swiperRef}
              indicator={(total, current) => (
                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {current + 1} / {total}
                </div>
              )}
              onIndexChange={(index) => setActiveIndex(index)}
              style={{
                '--height': '350px',
              }}
            >
              {mediaItems.map((item, index) => (
                <Swiper.Item key={item.key}>
                  <div style={{ 
                    width: '100%', 
                    height: '350px', 
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f5f5f5'
                  }}>
                    {item.type === 'image' ? (
                      <Image
                        src={item.url}
                        alt={property.title}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover'
                        }}
                        fallback={
                          <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            background: '#e8e8e8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#999',
                            fontSize: '24px'
                          }}>
                            🏠
                          </div>
                        }
                      />
                    ) : (
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        position: 'relative',
                        background: '#000'
                      }}>
                        {/* Direct video player */}
                        <video 
                          autoPlay
                          muted
                          loop
                          playsInline
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain'
                          }}
                        >
                          <source src={item.url} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                        
                        {/* Video badge */}
                        <div style={{ 
                          position: 'absolute', 
                          top: '16px', 
                          left: '16px',
                          background: 'rgba(22, 119, 255, 0.9)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          zIndex: 2
                        }}>
                          VIDEO
                        </div>
                      </div>
                    )}
                  </div>
                </Swiper.Item>
              ))}
            </Swiper>

            {/* Custom Navigation Buttons */}
            {/* Custom Navigation Buttons - Transparent Background */}
{mediaItems.length > 1 && (
  <>
    <Button 
      shape="rounded" 
      fill="none"
      style={{ 
        position: 'absolute', 
        left: '12px', 
        top: '50%', 
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.5)',
        color: 'white',
        border: 'none',
        width: '36px',
        height: '36px',
        zIndex: 10,
        minWidth: '36px',
        backdropFilter: 'blur(4px)'
      }}
      onClick={() => swiperRef.current?.swipePrev()}
    >
      <LeftIcon />
    </Button>
    <Button 
      shape="rounded" 
      fill="none"
      style={{ 
        position: 'absolute', 
        right: '12px', 
        top: '50%', 
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.5)',
        color: 'white',
        border: 'none',
        width: '36px',
        height: '36px',
        zIndex: 10,
        minWidth: '36px',
        backdropFilter: 'blur(4px)'
      }}
      onClick={() => swiperRef.current?.swipeNext()}
    >
      <RightOutline />
    </Button>
  </>
)}
          </>
        ) : (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            background: '#e8e8e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '24px'
          }}>
            🏠
          </div>
        )}
        
        {/* Property Tags */}
        <div style={{ 
          position: 'absolute', 
          bottom: '60px', 
          left: '16px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <Tag 
            color={property.listingType === 'Sale' ? 'danger' : 'primary'}
            style={{ 
              background: property.listingType === 'Sale' ? '#ff4d4f' : '#1677ff',
              color: 'white',
              fontWeight: '600',
              fontSize: '12px'
            }}
          >
            {property.listingType}
          </Tag>
          {property.isVerified && (
            <Tag 
              color="success"
              style={{ 
                background: '#52c41a',
                color: 'white',
                fontWeight: '600',
                fontSize: '12px'
              }}
            >
              Verified
            </Tag>
          )}
        </div>
      </div>

      {/* Property Info - Modern Clean Design */}
      <div style={{ 
        padding: '16px',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Main Property Card */}
        <Card 
          style={{ 
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #f0f0f0',
            marginBottom: '16px',
            overflow: 'hidden'
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '20px', 
              fontWeight: '700',
              color: '#1a1a1a',
              lineHeight: '1.4',
              wordWrap: 'break-word'
            }}>
              {property.title}
            </h1>
            
            {/* Location - Fixed to not open video */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '8px', 
              marginBottom: '12px' 
            }}>
              <EnvironmentOutline style={{ 
                color: '#666', 
                fontSize: '16px',
                marginTop: '2px',
                flexShrink: 0
              }} />
              <span style={{ 
                color: '#666',
                fontSize: '14px',
                fontWeight: '400',
                lineHeight: '1.4',
                wordWrap: 'break-word'
              }}>
                {[property.locality, property.city, property.state].filter(Boolean).join(', ')}
              </span>
            </div>
            
            {/* Price Section */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '8px',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <h2 style={{ 
                margin: '0', 
                color: '#ff4d4f', 
                fontSize: '24px', 
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}>
                {formatPrice(property.price)}
              </h2>
              {property.negotiable && (
                <Tag 
                  color="green" 
                  style={{ 
                    fontSize: '11px',
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    color: '#52c41a',
                    margin: 0
                  }}
                >
                  Negotiable
                </Tag>
              )}
            </div>
            
            {/* Date */}
            {property.createdAt && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                marginTop: '8px', 
                fontSize: '12px', 
                color: '#999' 
              }}>
                <CalendarOutline />
                <span>Listed on {formatDate(property.createdAt)}</span>
              </div>
            )}
          </div>

          <Divider style={{ 
            borderColor: '#f0f0f0',
            margin: '16px 0'
          }} />

          {/* Key Features - Responsive Grid */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              marginBottom: '12px', 
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              Key Features
            </h3>
            <Grid columns={3} gap={8}>
              {[
                { label: 'Bedrooms', value: property.bedrooms },
                { label: 'Bathrooms', value: property.bathrooms },
                { label: 'Carpet Area', value: property.carpetArea ? `${property.carpetArea} sq.ft` : null },
                { label: 'Furnishing', value: property.furnishing },
                { label: 'Property Type', value: property.propertyType },
                { label: 'Construction', value: property.constructionStatus },
              ].filter(item => item.value).map((item, index) => (
                <Grid.Item key={index}>
                  <div style={{ 
                    padding: '12px 8px', 
                    background: '#fafafa',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid #f0f0f0',
                    minHeight: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '700', 
                      color: '#1677ff',
                      marginBottom: '2px',
                      lineHeight: '1.2'
                    }}>
                      {item.value}
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#666',
                      fontWeight: '500',
                      lineHeight: '1.2'
                    }}>
                      {item.label}
                    </div>
                  </div>
                </Grid.Item>
              ))}
            </Grid>
          </div>

          {/* Description */}
          {property.description && (
            <>
              <Divider style={{ 
                borderColor: '#f0f0f0',
                margin: '16px 0'
              }} />
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ 
                  marginBottom: '8px', 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1a1a1a'
                }}>
                  Description
                </h3>
                <p style={{ 
                  lineHeight: '1.5', 
                  color: '#666',
                  fontSize: '14px',
                  margin: 0,
                  wordWrap: 'break-word'
                }}>
                  {property.description}
                </p>
              </div>
            </>
          )}

          {/* Amenities */}
          {(property.parking || property.balcony || property.swimmingPool || property.gym || property.security) && (
            <>
              <Divider style={{ 
                borderColor: '#f0f0f0',
                margin: '16px 0'
              }} />
              <div style={{ marginBottom: '8px' }}>
                <h3 style={{ 
                  marginBottom: '12px', 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1a1a1a'
                }}>
                  Amenities
                </h3>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px'
                }}>
                  {property.parking && <Tag color="blue" style={{ fontSize: '12px', padding: '4px 8px', margin: 0 }}>Parking</Tag>}
                  {property.balcony && <Tag color="green" style={{ fontSize: '12px', padding: '4px 8px', margin: 0 }}>Balcony</Tag>}
                  {property.swimmingPool && <Tag color="orange" style={{ fontSize: '12px', padding: '4px 8px', margin: 0 }}>Swimming Pool</Tag>}
                  {property.gym && <Tag color="purple" style={{ fontSize: '12px', padding: '4px 8px', margin: 0 }}>Gym</Tag>}
                  {property.security && <Tag color="red" style={{ fontSize: '12px', padding: '4px 8px', margin: 0 }}>Security</Tag>}
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Contact Section */}
        <Card style={{ 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #f0f0f0',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            marginBottom: '12px', 
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a1a1a'
          }}>
            Contact {property.owner?._id === currentUser?._id ? 'You' : 'Owner'}
          </h3>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '16px',
            padding: '12px',
            background: '#fafafa',
            borderRadius: '8px'
          }}>
            <Avatar 
              src={property.owner?.avatar} 
              style={{ 
                '--size': '48px',
                border: '2px solid #1677ff',
                flexShrink: 0
              }}
            >
              <UserOutline />
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: '600', 
                fontSize: '16px',
                color: '#1a1a1a',
                marginBottom: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {property.owner?.name || 'Property Owner'}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#1677ff',
                fontWeight: '500'
              }}>
                {property.owner?._id === currentUser?._id ? 'Your Listing' : 'Verified Seller'}
              </div>
            </div>
          </div>
          
          {property.owner?._id === currentUser?._id ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '16px', 
              background: '#f0f8ff',
              borderRadius: '8px',
              border: '1px solid #d6e4ff'
            }}>
              <p style={{ 
                color: '#1890ff', 
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                This is your property listing
              </p>
              <Button 
                color="primary" 
                fill="outline" 
                size="small"
                style={{ 
                  borderRadius: '8px',
                  fontWeight: '500'
                }}
                onClick={() => navigate('/my-properties')}
              >
                Manage Properties
              </Button>
            </div>
          ) : (
            <Space block style={{ '--gap': '8px' }}>
              <Button 
                color="primary" 
                block 
                size="large"
                onClick={handleCallOwner}
                style={{
                  borderRadius: '8px',
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <PhoneFill /> Call Now
              </Button>
              <Button 
                color="success" 
                block 
                size="large"
                onClick={handleMessageOwner}
                style={{
                  borderRadius: '8px',
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <MessageOutline /> WhatsApp
              </Button>
            </Space>
          )}
        </Card>
      </div>

      {/* Video Modal */}
      <Modal
        visible={videoModalVisible}
        onClose={() => setVideoModalVisible(false)}
        title="Property Video"
        content={
          <div style={{ textAlign: 'center', padding: '16px' }}>
            {currentVideo ? (
              <video 
                controls 
                autoPlay
                style={{ 
                  width: '100%', 
                  maxHeight: '300px', 
                  borderRadius: '8px',
                  background: '#000'
                }}
              >
                <source src={currentVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div style={{ padding: '32px', color: '#666' }}>
                <EnvironmentOutline style={{ fontSize: '40px', marginBottom: '12px', color: '#ccc' }} />
                <p>No video available</p>
              </div>
            )}
          </div>
        }
      />

      {/* Fixed Bottom Action Bar */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        background: 'white', 
        padding: '12px 16px', 
        borderTop: '1px solid #f0f0f0',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
      }}>
        
      </div>

      {/* Add padding to account for fixed bottom bar */}
      <div style={{ height: '68px' }}></div>
    </div>
  );
};

export default PropertyDetails;