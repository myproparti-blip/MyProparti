import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import {
    Button,
    Toast,
    Modal,
    Selector,
    ImageViewer,
    Swiper,
    Badge,
    Input,
} from "antd-mobile";
import {
    AddOutline,
    DeleteOutline,
    CloseOutline,
    LinkOutline,
} from "antd-mobile-icons";
import { advertisementService } from "../../services/advertise";
import { setAdvertisements } from "../../store/slices/homeSlice";

const AdvertisementManager = ({
    advertisements = [],
    onAdUpdate,
    isAdmin,
    chunkIndex,
    positionId,
    pageKey
}) => {
    const dispatch = useDispatch();
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [urlModalVisible, setUrlModalVisible] = useState(false);
    const [uploadType, setUploadType] = useState("multiple");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [redirectUrls, setRedirectUrls] = useState([]);
    const [currentRedirectUrl, setCurrentRedirectUrl] = useState("");
    const [currentAd, setCurrentAd] = useState(null);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [localAd, setLocalAd] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const videoRefs = useRef({});

    // Refresh advertisements from server and update Redux
    const refreshAdvertisementsFromServer = async () => {
        try {
            const response = await advertisementService.getAllAdvertisements(pageKey);
            if (response.data.success && Array.isArray(response.data.data)) {
                // Update Redux store with fresh data
                dispatch(setAdvertisements(response.data.data));
                console.log('✅ Advertisements refreshed from server');
            }
        } catch (error) {
            console.error('Failed to refresh advertisements:', error);
        }
    };

    // Improved ad selection logic to prevent duplicate ads
    useEffect(() => {
        console.log('AdvertisementManager Debug:', {
            totalAds: advertisements.length,
            pageKey,
            positionId,
            allAds: advertisements
        });

        // Filter ads by both pageKey AND positionId
        const filteredAds = advertisements.filter(ad => {
            if (!ad) return false;

            console.log('Checking ad:', {
                adId: ad._id,
                adPageKey: ad.pageKey,
                targetPageKey: pageKey,
                adPosition: ad.position,
                targetPosition: positionId,
                hasUrl: !!ad.url,
                hasFiles: Array.isArray(ad.files) && ad.files.length > 0,
                type: ad.type
            });

            // Check BOTH pageKey AND position match
            const pageKeyMatch = ad.pageKey === pageKey;
            const positionMatch = Number(ad.position) === Number(positionId);

            // Check if ad has content
            const hasContent = ad.url || (Array.isArray(ad.files) && ad.files.length > 0);

            return pageKeyMatch && positionMatch && hasContent;
        });

        console.log('Filtered ads for page', pageKey, 'position', positionId, ':', filteredAds);

        // Use the first matching ad or null
        setLocalAd(filteredAds[0] || null);
    }, [advertisements, positionId, pageKey]);

    const uploadTypeOptions = [
        { label: "Single Photo", value: "image" },
        { label: "Single Video", value: "video" },
        { label: "Multiple Files", value: "multiple" },
    ];

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        if (uploadType === "image") {
            const image = files.find(f => f.type.startsWith("image/"));
            if (!image) return Toast.show("Select a valid image");
            setSelectedFiles([image]);
        } else if (uploadType === "video") {
            const video = files.find(f => f.type.startsWith("video/"));
            if (!video) return Toast.show("Select a valid video");
            setSelectedFiles([video]);
        } else {
            setSelectedFiles(files);
            // Initialize empty URLs for multiple files
            setRedirectUrls(new Array(files.length).fill(""));
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            Toast.show("Please select files first");
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("position", positionId.toString());
            formData.append("pageKey", pageKey);

            // Add redirect URL to form data
            if (currentRedirectUrl) {
                formData.append("redirectUrl", currentRedirectUrl);
            }

            if (uploadType === "image") {
                formData.append("image", selectedFiles[0]);
                await advertisementService.uploadImage(formData);
            } else if (uploadType === "video") {
                formData.append("video", selectedFiles[0]);
                await advertisementService.uploadVideo(formData);
            } else {
                selectedFiles.forEach(file => formData.append("files", file));
                // For multiple files, send array of URLs
                if (redirectUrls.some(url => url)) {
                    formData.append("redirectUrls", JSON.stringify(redirectUrls));
                }
                await advertisementService.uploadMultiple(formData);
            }

            Toast.show("Advertisement uploaded successfully");
            setUploadModalVisible(false);
            setSelectedFiles([]);
            setRedirectUrls([]);
            setCurrentRedirectUrl("");
            // Refresh ads from server after upload
            await refreshAdvertisementsFromServer();
            onAdUpdate?.();
        } catch (err) {
            console.error(err);
            Toast.show("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdateUrl = async () => {
        if (!currentAd) return;

        try {
            await advertisementService.updateAdvertisementUrl(currentAd._id, {
                redirectUrl: currentRedirectUrl
            });
            Toast.show("URL updated successfully");
            setUrlModalVisible(false);
            setCurrentRedirectUrl("");
            setCurrentAd(null);
            // Refresh ads from server after URL update
            await refreshAdvertisementsFromServer();
            onAdUpdate?.();
        } catch (err) {
            console.error(err);
            Toast.show("Failed to update URL");
        }
    };

    const handleDelete = async (id) => {
        try {
            // Delete the advertisement completely
            await advertisementService.deleteAdvertisement(id);
            Toast.show("Advertisement deleted successfully");
            // Update local state to show empty card
            setLocalAd(null);
            // Refresh ads from server after deletion to sync all users
            await refreshAdvertisementsFromServer();
            onAdUpdate?.();
        } catch (e) {
            console.error(e);
            Toast.show("Failed to delete advertisement");
        }
    };

    const handleAdClick = (ad, fileIndex = null) => {
        if (!ad) return;

        let urlToOpen = null;

        if (ad.type === "multiple" && fileIndex !== null) {
            // For multiple ads, use individual file URL or fallback to main URL
            const file = ad.files[fileIndex];
            urlToOpen = file.redirectUrl || ad.redirectUrl;
        } else {
            // For single image/video, use main redirect URL
            urlToOpen = ad.redirectUrl;
        }

        if (urlToOpen) {
            window.open(urlToOpen, '_blank');
        } else if (isAdmin) {
            // If no URL set and user is admin, open URL modal
            setCurrentAd(ad);
            setCurrentRedirectUrl(ad.redirectUrl || "");
            setUrlModalVisible(true);
        }
    };

    const getFilesArray = (ad) => {
        if (ad?.type === "multiple" && Array.isArray(ad.files))
            return ad.files.filter(f => f.url || f);
        return [];
    };

    const getFileUrl = (file) =>
        typeof file === "string" ? file : file.url || file;

    const getFileType = (file) => {
        const url = getFileUrl(file);
        return /\.(mp4|webm|ogg|mov|avi)$/i.test(url) ? "video" : "image";
    };

    const openImageViewer = (index) => {
        setCurrentImageIndex(index);
        setImageViewerVisible(true);
    };

    // Function to generate default property-related image based on card size
    const getDefaultPropertyImage = (width = 300, height = 200) => {
        const colors = ['4A90E2', '50C878', 'FF6B6B', '9B59B6', 'E67E22'];
        const color = colors[positionId % colors.length];

        const propertyIcons = ['🏠', '🏢', '🏨', '🏪', '🏛️', '🏬'];
        const icon = propertyIcons[positionId % propertyIcons.length];

        return `https://dummyimage.com/${width}x${height}/${color}/ffffff&text=${encodeURIComponent(icon + ' Property Ad ' + positionId)}`;
    };

    const AdvertisementCard = ({ ad }) => {
        const hasContent = ad && (ad.url || (ad.files && ad.files.length > 0));
        const files = getFilesArray(ad);
        const hasMultiple = files.length > 1;
        const swiperRef = useRef(null);
        const videoRefs = useRef({});
        const imageTimeouts = useRef({});

        // Clear timeouts on unmount
        useEffect(() => {
            return () => {
                Object.values(imageTimeouts.current).forEach(clearTimeout);
            };
        }, []);

        // Handle video ended event - auto advance to next slides
        const handleVideoEnded = (currentIndex) => {
            if (swiperRef.current && files.length > 1) {
                // Move to next slide when video ends
                const nextIndex = (currentIndex + 1) % files.length;
                swiperRef.current.swipeTo(nextIndex);
            } else if (swiperRef.current && files.length === 1) {
                // If only one video, restart it
                videoRefs.current[currentIndex].currentTime = 0;
                videoRefs.current[currentIndex].play();
            }
        };

        // Auto-play current video when slide changes
        const handleSlideChange = (index) => {
            // Clear any existing timeouts
            Object.values(imageTimeouts.current).forEach(clearTimeout);
            imageTimeouts.current = {};

            const currentFile = files[index];
            if (getFileType(currentFile) === "video" && videoRefs.current[index]) {
                const video = videoRefs.current[index];
                video.currentTime = 0; // Reset to beginning
                video.play().catch(e => console.log('Auto-play prevented:', e));
            } else if (getFileType(currentFile) === "image" && files.length > 1) {
                // Set timeout for image auto-advance
                imageTimeouts.current[index] = setTimeout(() => {
                    if (swiperRef.current) {
                        const nextIndex = (index + 1) % files.length;
                        swiperRef.current.swipeTo(nextIndex);
                    }
                }, 5000); // 5 seconds for images
            }
        };

        return (
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "200px",
                    marginBottom: "16px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    background: "white",
                    cursor: (ad?.redirectUrl || (isAdmin && hasContent)) ? "pointer" : "default",
                }}
                onClick={() => !isAdmin && handleAdClick(ad)}
            >
                {isAdmin && (
                    <div
                        style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            zIndex: 10,
                            display: "flex",
                            gap: "4px",
                        }}
                    >
                        {/* Add URL button */}

                        <Button
                            size="mini"
                            color="primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                setUploadModalVisible(true);
                            }}
                        >
                            <AddOutline />
                        </Button>
                        {ad?._id && (
                            <Button
                                size="mini"
                                color="danger"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(ad._id);
                                }}
                            >
                                <DeleteOutline />
                            </Button>
                        )}
                    </div>
                )}

                {/* Add URL badge for admin */}
                {isAdmin && ad?.redirectUrl && (
                    <Badge
                        content="🔗"
                        style={{
                            position: "absolute",
                            top: "8px",
                            left: "8px",
                            zIndex: 10,
                            background: "rgba(255,255,255,0.9)",
                            borderRadius: "50%",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                        }}
                    />
                )}

                {!hasContent ? (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            border: "2px dashed rgba(0,0,0,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(0,0,0,0.7)",
                            cursor: isAdmin ? "pointer" : "default",
                            background: "#f9f9f913",
                            position: "relative",
                            overflow: "hidden",
                        }}
                        onClick={() => isAdmin && setUploadModalVisible(true)}
                    >
                        {/* Default Property Image */}
                        <img
                            src={getDefaultPropertyImage(300, 200)}
                            alt="Default Property Advertisement"
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                opacity: 0.7,
                                position: "absolute",
                                top: 0,
                                left: 0,
                            }}
                        />

                        {/* Overlay with Add button */}
                        <div
                            style={{
                                position: "relative",
                                zIndex: 2,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255,255,255,0.8)",
                                padding: "12px",
                                borderRadius: "8px",
                            }}
                        >
                            <AddOutline style={{ fontSize: "28px", marginBottom: "4px" }} />
                            <span style={{ marginLeft: "6px", fontWeight: "bold" }}>
                                {isAdmin ? "Add Advertisement" : ""}
                            </span>
                        </div>
                    </div>
                ) : ad.type === "multiple" && files.length > 0 ? (
                    <Swiper
                        ref={swiperRef}
                        autoplay={false}
                        loop={false}
                        allowTouchMove={false}
                        key={files.map(f => getFileUrl(f)).join(",")}
                        indicator={(total, current) => (
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: "8px",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    display: "flex",
                                    gap: "4px",
                                    zIndex: 5,
                                }}
                            >
                                {Array.from({ length: total }).map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: "50%",
                                            background:
                                                current === i
                                                    ? "#1677ff"
                                                    : "rgba(255,255,255,0.5)",
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                        onIndexChange={handleSlideChange}
                        defaultIndex={0}
                    >
                        {files.map((file, idx) => (
                            <Swiper.Item
                                key={idx}
                                onClick={() => handleAdClick(ad, idx)}
                            >
                                {getFileType(file) === "image" ? (
                                    <img
                                        src={getFileUrl(file)}
                                        style={{
                                            width: "100%",
                                            height: "200px",
                                            objectFit: "cover",
                                            background: "#f5f5f5",
                                        }}
                                        alt={`Advertisement ${idx + 1}`}
                                        onLoad={() => {
                                            if (idx === 0 && files.length > 1) {
                                                imageTimeouts.current[idx] = setTimeout(() => {
                                                    if (swiperRef.current) {
                                                        const nextIndex = (idx + 1) % files.length;
                                                        swiperRef.current.swipeTo(nextIndex);
                                                    }
                                                }, 5000);
                                            }
                                        }}
                                    />
                                ) : (
                                    <video
                                        ref={(el) => (videoRefs.current[idx] = el)}
                                        src={getFileUrl(file)}
                                        style={{
                                            width: "100%",
                                            height: "200px",
                                            background: "#000",
                                            objectFit: "cover",
                                        }}
                                        autoPlay={idx === 0}
                                        muted
                                        playsInline
                                        onEnded={() => handleVideoEnded(idx)}
                                        onError={(e) => {
                                            console.error('Video error:', e);
                                            setTimeout(() => {
                                                if (swiperRef.current && files.length > 1) {
                                                    const nextIndex = (idx + 1) % files.length;
                                                    swiperRef.current.swipeTo(nextIndex);
                                                }
                                            }, 2000);
                                        }}
                                    />
                                )}
                            </Swiper.Item>
                        ))}
                    </Swiper>
                ) : ad.type === "video" ? (
                    <div onClick={() => handleAdClick(ad)}>
                        <video
                            src={ad.url}
                            style={{
                                width: "100%",
                                height: "100%",
                                background: "#000",
                                objectFit: "cover",
                            }}
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                    </div>
                ) : (
                    <div onClick={() => handleAdClick(ad)}>
                        <img
                            src={ad.url}
                            alt="Advertisement"
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                background: "#f5f5f5",
                            }}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <AdvertisementCard ad={localAd} />

            {/* Upload Modal */}
            <Modal
                visible={uploadModalVisible}
                onClose={() => {
                    setUploadModalVisible(false);
                    setSelectedFiles([]);
                    setRedirectUrls([]);
                    setCurrentRedirectUrl("");
                }}
                bodyStyle={{
                    maxHeight: '70vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                content={
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        overflow: 'hidden'
                    }}>
                        {/* Fixed Header */}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "16px",
                                borderBottom: "1px solid #f0f0f0",
                                flexShrink: 0,
                            }}
                        >
                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                Upload Advertisement (Position {positionId})
                            </span>
                            <Button
                                fill="none"
                                size="small"
                                onClick={() => setUploadModalVisible(false)}
                            >
                                <CloseOutline />
                            </Button>
                        </div>

                        {/* Scrollable Content */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '19px',
                            WebkitOverflowScrolling: 'touch'
                        }}>
                            <div style={{ marginBottom: '16px' }}>
                                <h4 style={{ marginBottom: '8px' }}>Select Upload Type</h4>
                                <Selector
                                    options={uploadTypeOptions}
                                    value={[uploadType]}
                                    onChange={(v) => setUploadType(v[0])}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <h4 style={{ marginBottom: '8px' }}>Select Files</h4>
                                <input
                                    type="file"
                                    multiple={uploadType === "multiple"}
                                    accept={
                                        uploadType === "image"
                                            ? "image/*"
                                            : uploadType === "video"
                                                ? "video/*"
                                                : "image/*,video/*"
                                    }
                                    onChange={handleFileSelect}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #d9d9d938',
                                        borderRadius: '6px'
                                    }}
                                />
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    {uploadType === "image" && "Select one image file"}
                                    {uploadType === "video" && "Select one video file"}
                                    {uploadType === "multiple" && "Select multiple image/video files"}
                                </div>
                            </div>

                            {/* Redirect URL Input */}
                            <div style={{ marginBottom: '16px' }}>
                                <h4 style={{ marginBottom: '8px' }}>Redirect URL (Optional)</h4>
                                <Input
                                    placeholder="https://example.com"
                                    value={currentRedirectUrl}
                                    onChange={setCurrentRedirectUrl}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '6px'
                                    }}
                                />
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    Where users will be redirected when they click this ad
                                </div>
                            </div>

                            {/* Individual URLs for multiple files */}
                            {uploadType === "multiple" && selectedFiles.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ marginBottom: '8px' }}>Individual File URLs (Optional)</h4>
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} style={{ marginBottom: '8px' }}>
                                            <div style={{ fontSize: '12px', marginBottom: '4px', color: '#666' }}>
                                                {file.name}
                                            </div>
                                            <Input
                                                placeholder={`URL for ${file.name}`}
                                                value={redirectUrls[index] || ""}
                                                onChange={(value) => {
                                                    const newUrls = [...redirectUrls];
                                                    newUrls[index] = value;
                                                    setRedirectUrls(newUrls);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px',
                                                    border: '1px solid #d9d9d9',
                                                    borderRadius: '4px',
                                                    fontSize: '12px'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedFiles.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ marginBottom: '8px' }}>
                                        Preview ({selectedFiles.length})
                                    </h4>
                                    <div style={{
                                        display: "flex",
                                        gap: "8px",
                                        flexWrap: "wrap",
                                        maxHeight: '120px',
                                        overflowY: 'auto'
                                    }}>
                                        {selectedFiles.map((file, i) => (
                                            <div key={i} style={{ position: "relative" }}>
                                                {file.type.startsWith("image/") ? (
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        style={{
                                                            width: 80,
                                                            height: 80,
                                                            borderRadius: 8,
                                                            objectFit: "cover",
                                                        }}
                                                        alt={`Preview ${i + 1}`}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: 80,
                                                            height: 80,
                                                            background: "#eeeeee5e",
                                                            borderRadius: 8,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: '12px',
                                                            color: '#666'
                                                        }}
                                                    >
                                                        📹 Video
                                                    </div>
                                                )}
                                                <Button
                                                    size="mini"
                                                    style={{
                                                        position: "absolute",
                                                        top: -6,
                                                        right: -6,
                                                        background: "#ff4d4f",
                                                        borderRadius: "50%",
                                                        color: "#fff",
                                                        width: '20px',
                                                        height: '20px',
                                                        minWidth: '20px',
                                                        padding: 0
                                                    }}
                                                    onClick={() => {
                                                        setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
                                                        if (uploadType === "multiple") {
                                                            const newUrls = [...redirectUrls];
                                                            newUrls.splice(i, 1);
                                                            setRedirectUrls(newUrls);
                                                        }
                                                    }}
                                                >
                                                    <CloseOutline fontSize={12} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fixed Footer with Buttons */}
                        <div style={{
                            padding: "16px",
                            borderTop: "1px solid #ababab3b",
                            flexShrink: 0,
                            display: 'flex',
                            gap: '8px'
                        }}>
                            <Button
                                style={{ flex: 1 }}
                                onClick={() => setUploadModalVisible(false)}
                                disabled={isUploading}
                            >
                                Cancel
                            </Button>
                            <Button
                                color="primary"
                                style={{ flex: 1 }}
                                onClick={handleUpload}
                                disabled={selectedFiles.length === 0 || isUploading}
                                loading={isUploading}
                                loadingText="Uploading..."
                            >
                                {isUploading ? 'Uploading' : 'Upload'}
                            </Button>
                        </div>
                    </div>
                }
            />


            {localAd?.url && (
                <ImageViewer
                    image={localAd.url}
                    visible={imageViewerVisible}
                    onClose={() => setImageViewerVisible(false)}
                />
            )}
        </>
    );
};

export default AdvertisementManager;