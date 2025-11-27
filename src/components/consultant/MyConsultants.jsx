import React, { useState, useEffect } from "react";
import {
  Card,
  Grid,
  Tag,
  Button,
  Empty,
  Image,
  Space,
  Toast,
  Modal,
  TextArea,
  SpinLoading,
} from "antd-mobile";
import {
  EyeOutline,
  EnvironmentOutline,
  CheckCircleOutline,
  CloseCircleOutline,
} from "antd-mobile-icons";
import { useNavigate } from "react-router-dom";
import {
  getConsultants,
  approveConsultant,
  rejectConsultant,
} from "../../services/consultants";
import { getProfile } from "../../services/auth";

const MyConsultants = () => {
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    type: "",
    consultant: null,
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const navigate = useNavigate();

  // ✅ Check if user has admin role
  const checkAdminRole = (userData) => {
    if (!userData) return false;

    if (Array.isArray(userData)) {
      return userData.some((user) => {
        const roles = user.role;
        return Array.isArray(roles)
          ? roles.includes("admin")
          : roles === "admin";
      });
    }

    const roles = userData.role;
    return Array.isArray(roles) ? roles.includes("admin") : roles === "admin";
  };

  // ✅ Fetch profile & consultants
  const fetchData = async () => {
    setLoading(true);
    try {
      const profileRes = await getProfile();
      if (profileRes?.success) {
        const userData =
          profileRes.data?.users || profileRes.data?.user || profileRes.data;
        setUser(userData);

        const adminCheck = checkAdminRole(userData);
        setIsAdmin(adminCheck);

        if (adminCheck) {
          const consultantRes = await getConsultants();
          if (consultantRes.success) {
            setConsultants(consultantRes.data?.data || consultantRes.data || []);
          } else {
            Toast.show({ content: "Failed to load consultants" });
            setConsultants([]);
          }
        } else {
          setConsultants([]);
        }
      } else {
        Toast.show({ content: "Failed to load user profile" });
        setIsAdmin(false);
        setConsultants([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      Toast.show({ content: "Error loading data" });
      setIsAdmin(false);
      setConsultants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ Open confirm modal (approve/reject)
  const openConfirmModal = (type, consultant) => {
    setRejectionReason("");
    setConfirmModal({ visible: true, type, consultant });
  };

  // ✅ Handle Approve / Reject
  const handleConfirmAction = async () => {
    const { type, consultant } = confirmModal;
    if (!consultant) return;

    try {
      setLoading(true);
      let res;

      if (type === "approve") {
        res = await approveConsultant(consultant._id);
      } else {
        if (!rejectionReason.trim()) {
          Toast.show({ content: "Please enter rejection reason" });
          setLoading(false);
          return;
        }
        // ✅ Backend expects { reason: "..." }
        res = await rejectConsultant(consultant._id, {
          reason: rejectionReason,
        });
      }

      if (res.success) {
        Toast.show({
          icon: "success",
          content: `Consultant ${
            type === "approve" ? "approved" : "rejected"
          } successfully`,
        });
        fetchData();
      } else {
        Toast.show({
          icon: "fail",
          content: res.error || `Failed to ${type} consultant`,
        });
      }
    } catch (err) {
      console.error("Action error:", err);
      Toast.show({ icon: "fail", content: "Action failed, please try again" });
    } finally {
      setLoading(false);
      setConfirmModal({ visible: false, type: "", consultant: null });
      setRejectionReason("");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
        }}
      >
        <SpinLoading color="primary" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", padding: "16px" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
          {isAdmin ? "All Consultants - Admin Panel" : "My Consultants"}
        </h1>
        <p style={{ margin: 0, color: "#666" }}>
          {isAdmin
            ? `Showing ${consultants.length} consultants for approval`
            : "Access Restricted - Admin Only"}
        </p>
        {isAdmin && (
          <p style={{ margin: "5px 0 0 0", color: "#999", fontSize: "12px" }}>
            You have administrator privileges
          </p>
        )}
      </div>

      {/* Show content only for admin users */}
      {isAdmin ? (
        consultants.length === 0 ? (
          <Empty description="No consultants found for approval" />
        ) : (
          <Grid columns={1} gap={12}>
            {consultants.map((consultant) => {
              const status = consultant.status?.toLowerCase();
              const showAdminActions = status === "pending";

              return (
                <Grid.Item key={consultant._id}>
                  <Card>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <Image
                        src={consultant.image || "/default-user.jpg"}
                        alt={consultant.name}
                        style={{
                          width: "100px",
                          height: "100px",
                          borderRadius: "8px",
                          objectFit: "cover",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        {/* Name + Designation */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "6px",
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "16px",
                              fontWeight: "600",
                            }}
                          >
                            {consultant.name}
                          </h3>
                          <Tag color="primary" size="small">
                            {consultant.designation}
                          </Tag>
                        </div>

                        {/* Status Tags */}
                        {status === "approved" ? (
                          <Tag color="success" style={{ marginBottom: 6 }}>
                            ✅ Approved
                          </Tag>
                        ) : status === "rejected" ? (
                          <Tag color="danger" style={{ marginBottom: 6 }}>
                            ❌ Rejected
                          </Tag>
                        ) : (
                          <Tag color="warning" style={{ marginBottom: 6 }}>
                            ⏳ Pending Approval
                          </Tag>
                        )}

                        {/* Rejection Message */}
                        {status === "rejected" && consultant.rejectedReason && (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#ff4d4f",
                              margin: "4px 0 8px",
                              background: "#fff1f0",
                              padding: "6px 8px",
                              borderRadius: "6px",
                            }}
                          >
                            Reason: {consultant.rejectedReason}
                          </p>
                        )}

                        {/* Location */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginBottom: "6px",
                          }}
                        >
                          <EnvironmentOutline
                            style={{ fontSize: "12px", color: "#666" }}
                          />
                          <span style={{ fontSize: "12px", color: "#666" }}>
                            {consultant.location || "N/A"}
                          </span>
                        </div>

                        {/* Money */}
                        <div
                          style={{
                            marginBottom: "8px",
                            fontWeight: "bold",
                            color: "#ff4d4f",
                          }}
                        >
                          💰 {consultant.money}{" "}
                          {consultant.moneyType ? `/${consultant.moneyType}` : ""}
                        </div>

                        {/* Experience + Languages */}
                        <Space wrap style={{ marginBottom: "12px" }}>
                          {consultant.experience && (
                            <Tag fill="outline" size="small">
                              {consultant.experience} yrs exp
                            </Tag>
                          )}
                          {consultant.languages?.length > 0 && (
                            <Tag fill="outline" size="small">
                              {consultant.languages.join(", ")}
                            </Tag>
                          )}
                        </Space>

                        {/* Action Buttons */}
                        <div
                          style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                        >
                          <Button
                            size="mini"
                            color="primary"
                            // onClick={() =>
                            //   navigate(`/consultant/${consultant._id}`)
                            onClick={() =>
                               (`no path `)
                            }
                          >
                            <EyeOutline /> View
                          </Button>

                          {showAdminActions && (
                            <>
                              <Button
                                size="mini"
                                color="success"
                                onClick={() =>
                                  openConfirmModal("approve", consultant)
                                }
                              >
                                <CheckCircleOutline /> Approve
                              </Button>
                              <Button
                                size="mini"
                                color="danger"
                                onClick={() =>
                                  openConfirmModal("reject", consultant)
                                }
                              >
                                <CloseCircleOutline /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Grid.Item>
              );
            })}
          </Grid>
        )
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            background: "#fff",
            borderRadius: "8px",
            marginTop: "20px",
          }}
        >
          <Empty
            description="Access Denied"
            imageStyle={{ width: 64, height: 64 }}
          />
          <p style={{ marginTop: "16px", color: "#666", fontSize: "14px" }}>
            Administrator privileges required to view this page.
          </p>
          <Button
            color="primary"
            style={{ marginTop: "16px" }}
            onClick={() => navigate("/")}
          >
            Go to Homepage
          </Button>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {isAdmin && (
        <Modal
          visible={confirmModal.visible}
          title={
            confirmModal.type === "approve"
              ? "Approve Consultant"
              : "Reject Consultant"
          }
          onClose={() => {
            setConfirmModal({ visible: false, type: "", consultant: null });
            setRejectionReason("");
          }}
          content={
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p style={{ fontSize: "16px" }}>
                Are you sure you want to{" "}
                <span
                  style={{
                    color:
                      confirmModal.type === "approve" ? "#52c41a" : "#f5222d",
                    fontWeight: "600",
                  }}
                >
                  {confirmModal.type === "approve" ? "approve" : "reject"}
                </span>{" "}
                this consultant?
              </p>
              {confirmModal.type === "reject" && (
                <TextArea
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={setRejectionReason}
                  style={{ marginBottom: "16px" }}
                />
              )}
              <Space block>
                <Button
                  color="default"
                  onClick={() => {
                    setConfirmModal({ visible: false, type: "", consultant: null });
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color={
                    confirmModal.type === "approve" ? "success" : "danger"
                  }
                  onClick={handleConfirmAction}
                >
                  {confirmModal.type === "approve"
                    ? "Yes, Approve"
                    : "Yes, Reject"}
                </Button>
              </Space>
            </div>
          }
        />
      )}
    </div>
  );
};

export default MyConsultants;