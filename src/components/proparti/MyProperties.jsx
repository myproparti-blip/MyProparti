import React, { useState, useEffect } from 'react';
import {
  Card,
  Grid,
  Tag,
  Button,
  Empty,
  Image,
  Space,
  Toast,
  SpinLoading,
  Modal,
} from 'antd-mobile';
import {
  EnvironmentOutline,
  EditSOutline,
  DeleteOutline,
  EyeOutline,
  AddOutline,
} from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';
import {
  getOwnProperties,
  deleteProperty,
  getProperties,
  approveProperty,
  rejectProperty,
} from '../../services/properties';
import { getProfile } from '../../services/auth';
import PostProperty from './PostProperty';

const MyProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [postVisible, setPostVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, type: '', property: null });
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();

  // ✅ Fetch user & property data
  const fetchData = async () => {
    setLoading(true);
    console.log("🔍 FETCH DATA DEBUG START ------------------------");

    try {
      const profileResponse = await getProfile();
      console.log("👤 Profile Response:", profileResponse);

      if (!profileResponse?.success) {
        Toast.show({ content: "Failed to load user profile" });
        return;
      }

      let loggedUser = profileResponse.data?.user || null;

      if (!loggedUser && profileResponse.data?.users?.length) {
        loggedUser = profileResponse.data.users.find(u => u.role?.includes("admin"));
      }

      if (!loggedUser?._id) {
        console.warn("⚠️ No valid user found — skipping property fetch.");
        return;
      }

      setUser(loggedUser);
      console.log("✅ Valid user detected:", loggedUser.role);

      let propertyResponse;
      if (loggedUser.role?.includes("admin")) {
        propertyResponse = await getProperties();
      } else {
        propertyResponse = await getOwnProperties();
      }

      console.log("🏠 Property API Response:", propertyResponse);

      if (propertyResponse.success) {
         let propsData = [];
         // Backend returns { success, message, data: [...] }
         if (Array.isArray(propertyResponse.data)) {
           propsData = propertyResponse.data;
         } else if (Array.isArray(propertyResponse.data?.data)) {
           propsData = propertyResponse.data.data;
         }
         setProperties(propsData);
       } else {
         Toast.show({ content: "Failed to load properties" });
       }
    } catch (error) {
      console.error("💥 FETCH ERROR:", error);
      Toast.show({ content: "Error loading properties" });
    } finally {
      setLoading(false);
      console.log("🔚 FETCH DATA DEBUG END --------------------------");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ Price formatter
  const formatPrice = (price) => {
    if (!price) return 'Price on request';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
  };

  const confirmDelete = (property) => {
    setSelectedProperty(property);
    setDeleteModalVisible(true);
  };

  const handleDeleteProperty = async () => {
    if (!selectedProperty) return;
    try {
      setLoading(true);
      const res = await deleteProperty(selectedProperty._id);
      console.log("Delete response:", res);
      
      if (res && res.success) {
        Toast.show('Property deleted successfully');
        // Refresh data from server to sync all users
        await fetchData();
      } else {
        Toast.show(res?.error || 'Failed to delete property');
        console.log("Delete failed:", res);
        // Refresh to show actual state from server
        await fetchData();
      }
    } catch (error) {
      console.error('Delete error:', error);
      Toast.show('Error deleting property');
      // Refresh on error
      await fetchData();
    } finally {
      setLoading(false);
      setDeleteModalVisible(false);
      setSelectedProperty(null);
    }
  };

  const handlePropertyAdded = () => {
    fetchData();
    setPostVisible(false);
    setEditMode(false);
    setSelectedProperty(null);
  };

  const handleAddProperty = () => {
    setEditMode(false);
    setSelectedProperty(null);
    setPostVisible(true);
  };

  const handleEditProperty = (property) => {
    setEditMode(true);
    setSelectedProperty(property);
    setPostVisible(true);
  };

  // ✅ Admin Confirmation Modal
  const openConfirmModal = (type, property) => {
    setConfirmModal({ visible: true, type, property });
  };

  const handleConfirmAction = async () => {
    const { type, property, rejectionMessage } = confirmModal;
    if (!property) return;

    if (type === 'reject' && !rejectionMessage?.trim()) {
      Toast.show({ icon: 'fail', content: 'Please enter a rejection reason' });
      return;
    }

    try {
      setLoading(true);
      let res;

      if (type === 'approve') {
        res = await approveProperty(property._id);
      } else {
        res = await rejectProperty(property._id, rejectionMessage);
      }

      if (res.success) {
        Toast.show({
          icon: 'success',
          content: `Property ${type === 'approve' ? 'approved' : 'rejected'} successfully`,
        });
        fetchData();
      } else {
        Toast.show({
          icon: 'fail',
          content: res.error || `Failed to ${type} property`,
        });
      }
    } catch (error) {
      Toast.show({ icon: 'fail', content: 'Action failed, please try again' });
    } finally {
      setLoading(false);
      setConfirmModal({ visible: false, type: '', property: null, rejectionMessage: '' });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <SpinLoading color="primary" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '600' }}>
          {user?.role?.includes('admin') ? 'All Properties' : 'My Properties'}
        </h1>
        <p style={{ margin: 0, color: '#666' }}>
          {user?.role?.includes('admin')
            ? `Showing all listed properties (${properties.length})`
            : `Manage your property listings (${properties.length})`}
        </p>
      </div>

      {/* Add Property Button */}
      {!user?.role?.includes('admin') && (
        <Button
          color="primary"
          size="large"
          block
          style={{ marginBottom: '20px' }}
          onClick={handleAddProperty}
        >
          <AddOutline /> Add New Property
        </Button>
      )}

      {/* Property List */}
      {properties.length === 0 ? (
        <Empty description="No properties found" />
      ) : (
        <Grid columns={1} gap={12}>
          {properties.map((property) => (
            <Grid.Item key={property._id}>
              <Card>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Image
                    src={property.images?.[0] || '/default-property.jpg'}
                    alt={property.title}
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{property.title}</h3>
                      <Tag color={property.listingType?.toLowerCase() === 'sale' ? 'danger' : 'primary'} size="small">
                        {property.listingType}
                      </Tag>
                    </div>

                    {property.isRejected ? (
                      <Tag color="danger" style={{ marginBottom: 6 }}>❌ Rejected</Tag>
                    ) : property.isApproved ? (
                      <Tag color="success" style={{ marginBottom: 6 }}>✅ Approved</Tag>
                    ) : (
                      <Tag color="warning" style={{ marginBottom: 6 }}>⏳ Pending Approval</Tag>
                    )}

                    {property.isRejected && property.rejectionMessage && (
                      <p style={{
                        fontSize: '12px',
                        color: '#ff4d4f',
                        margin: '4px 0 8px',
                        background: '#fff1f0',
                        padding: '6px 8px',
                        borderRadius: '6px',
                      }}>
                        Reason: {property.rejectionMessage}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <EnvironmentOutline style={{ fontSize: '12px', color: '#666' }} />
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {property.locality}, {property.city}
                      </span>
                    </div>

                    <div style={{ fontWeight: 'bold', color: '#ff4d4f', marginBottom: '8px' }}>
                      {formatPrice(property.price)}
                    </div>

                    <Space wrap style={{ marginBottom: '12px' }}>
                      {property.bedrooms && <Tag fill="outline" size="small">{property.bedrooms}</Tag>}
                      {property.carpetArea && <Tag fill="outline" size="small">{property.carpetArea} sq.ft</Tag>}
                      {property.furnishing && <Tag fill="outline" size="small">{property.furnishing}</Tag>}
                    </Space>

                    {/* Buttons */}
                    <Space block>
                      <Button size="mini" color="primary" fill="solid" onClick={() => navigate(`/property/${property._id}`)}>
                        <EyeOutline />
                      </Button>

                      {user?.role?.includes('admin') ? (
                        <>
                          {!property.isApproved && !property.isRejected && (
                            <>
                              <Button
                                size="mini"
                                color="success"
                                onClick={() => openConfirmModal('approve', property)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="mini"
                                color="danger"
                                onClick={() => openConfirmModal('reject', property)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button size="mini" color="danger" fill="outline" onClick={() => confirmDelete(property)}>
                            <DeleteOutline /> 
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="mini" color="warning" fill="outline" onClick={() => handleEditProperty(property)}>
                            <EditSOutline /> 
                          </Button>
                          <Button size="mini" color="danger" fill="outline" onClick={() => confirmDelete(property)}>
                            <DeleteOutline /> 
                          </Button>
                        </>
                      )}
                    </Space>
                  </div>
                </div>
              </Card>
            </Grid.Item>
          ))}
        </Grid>
      )}

      {/* Add/Edit Modal */}
      <PostProperty
        visible={postVisible}
        onClose={() => {
          setPostVisible(false);
          setEditMode(false);
          setSelectedProperty(null);
        }}
        onSuccess={handlePropertyAdded}
        editMode={editMode}
        propertyData={selectedProperty}
      />

      {/* Delete Confirmation */}
      <Modal
        visible={deleteModalVisible}
        title="Delete Property"
        onClose={() => setDeleteModalVisible(false)}
        content={
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Are you sure you want to delete this property?</p>
            <p style={{ fontWeight: '600', marginBottom: '20px' }}>
              {selectedProperty?.title}
            </p>
            <Space block>
              <Button color="default" onClick={() => setDeleteModalVisible(false)}>
                Cancel
              </Button>
              <Button color="danger" onClick={handleDeleteProperty}>
                Delete
              </Button>
            </Space>
          </div>
        }
      />

      {/* Admin Approval/Rejection Modal */}
      <Modal
        visible={confirmModal.visible}
        title={confirmModal.type === 'approve' ? 'Approve Property' : 'Reject Property'}
        onClose={() => setConfirmModal({ visible: false, type: '', property: null })}
        content={
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ fontSize: '16px' }}>
              Are you sure you want to{' '}
              <span style={{ color: confirmModal.type === 'approve' ? '#52c41a' : '#f5222d', fontWeight: '600' }}>
                {confirmModal.type === 'approve' ? 'approve' : 'reject'}
              </span>{' '}
              this property?
            </p>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>
              This action cannot be undone.
            </p>

            {/* Rejection message input */}
            {confirmModal.type === 'reject' && (
              <textarea
                placeholder="Enter rejection reason"
                value={confirmModal.rejectionMessage || ''}
                onChange={(e) =>
                  setConfirmModal((prev) => ({ ...prev, rejectionMessage: e.target.value }))
                }
                style={{
                  width: '100%',
                  minHeight: '80px',
                  marginBottom: '16px',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                }}
              />
            )}

            <Space block>
              <Button color="default" onClick={() => setConfirmModal({ visible: false, type: '', property: null })}>
                Cancel
              </Button>
              <Button
                color={confirmModal.type === 'approve' ? 'success' : 'danger'}
                onClick={handleConfirmAction}
              >
                {confirmModal.type === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
              </Button>
            </Space>
          </div>
        }
      />
    </div>
  );
};

export default MyProperties;