package com.graphhopper.routing.util.parsers;

import com.graphhopper.reader.ReaderWay;
import com.graphhopper.routing.ev.*;
import com.graphhopper.routing.util.PriorityCode;

import java.util.TreeMap;

import static com.graphhopper.routing.util.PriorityCode.*;
import static com.graphhopper.routing.util.parsers.AbstractAccessParser.INTENDED;

public class RacingBikePriorityParser extends BikeCommonPriorityParser {

    public RacingBikePriorityParser(EncodedValueLookup lookup) {
        this(lookup.getDecimalEncodedValue(VehiclePriority.key("racingbike")));
    }

    protected RacingBikePriorityParser(DecimalEncodedValue priorityEnc) {
        super(priorityEnc);

        addPushingSection("path");

        preferHighwayTags.add("road");
        preferHighwayTags.add("secondary");
        preferHighwayTags.add("secondary_link");
        preferHighwayTags.add("tertiary");
        preferHighwayTags.add("tertiary_link");
        preferHighwayTags.add("residential");

        avoidHighwayTags.put("motorway", BAD);
        avoidHighwayTags.put("motorway_link", BAD);
        avoidHighwayTags.put("trunk", BAD);
        avoidHighwayTags.put("trunk_link", BAD);
        avoidHighwayTags.put("primary", UNCHANGED);
        avoidHighwayTags.put("primary_link", UNCHANGED);

        setSpecificClassBicycle("roadcycling");

        avoidSpeedLimit = 81;
    }

    @Override
    void collect(ReaderWay way, boolean bikeDesignated, TreeMap<Double, PriorityCode> weightToPrioMap) {
        super.collect(way, bikeDesignated, weightToPrioMap);

        String highway = way.getTag("highway");
        if ("service".equals(highway) || "residential".equals(highway)) {
            weightToPrioMap.put(40d, SLIGHT_AVOID);
        } else if ("track".equals(highway)) {
            String trackType = way.getTag("tracktype");
            if ("grade1".equals(trackType) || goodSurface.contains(way.getTag("surface", "")))
                weightToPrioMap.put(110d, SLIGHT_PREFER);
            else if (trackType == null || trackType.startsWith("grade"))
                weightToPrioMap.put(110d, AVOID_MORE);
        } else if ("path".equals(highway))  {
            boolean isGoodSurface = way.getTag("tracktype", "").equals("grade1") || goodSurface.contains(way.getTag("surface", ""));
            if (isGoodSurface)
                if (way.hasTag("foot", INTENDED) && !way.hasTag("segregated", "yes"))
                    weightToPrioMap.put(100d, UNCHANGED);
                else
                    weightToPrioMap.put(100d, SLIGHT_PREFER);
            else
                weightToPrioMap.put(100d, AVOID_MORE);
        }
        if ("cycleway".equals(highway)) {
            if (way.hasTag("foot", INTENDED) && !way.hasTag("segregated", "yes"))
                weightToPrioMap.put(100d, UNCHANGED);
            else
                weightToPrioMap.put(100d, SLIGHT_PREFER);
        }

    }
}
