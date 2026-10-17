import { StyleProp, ViewStyle } from 'react-native';
import { ConcreteItineraryItem, ItineraryItemType } from '@/types/itinerary';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends MapCoordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarkerItem {
  id: string;
  coordinate: MapCoordinate;
  title: string;
  description?: string;
  type?: ItineraryItemType;
  categoryLabel?: string;
  pinColor?: string;
  isDestinationPoint?: boolean;
  originalItem?: ConcreteItineraryItem;
}

export interface VoyaroMapViewProps {
  initialRegion?: MapRegion;
  region?: MapRegion;
  markers?: MapMarkerItem[];
  selectedMarkerId?: string;
  style?: StyleProp<ViewStyle>;
  autoFit?: boolean;
  onRegionChangeComplete?: (region: MapRegion) => void;
  onMarkerPress?: (marker: MapMarkerItem) => void;
  onMapPress?: () => void;
  showsUserLocation?: boolean;
  userLocation?: MapCoordinate | null;
  cameraFocusRegion?: { region: MapRegion; trigger: number } | null;
  showsCompass?: boolean;
  showsScale?: boolean;
  routeGeometry?: MapCoordinate[];
  routeStrokeColor?: string;
  routeStrokeWidth?: number;
  testID?: string;
}

